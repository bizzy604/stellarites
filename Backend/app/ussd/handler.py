"""USSD session and menu handler. Africa's Talking callback logic."""
import json
import time
from app.config import Config
from app.services.user_service import create_account

# In-memory session store when REDIS_URL is not set. Key -> (data dict, expiry timestamp).
_memory_sessions: dict[str, tuple[dict, float]] = {}


def _use_redis() -> bool:
    """True if Redis is configured."""
    url = (Config.REDIS_URL or "").strip()
    return bool(url)


def _redis():
    import redis
    return redis.from_url(Config.REDIS_URL)


def get_session(session_id: str) -> dict:
    if _use_redis():
        key = f"ussd:session:{session_id}"
        try:
            data = _redis().get(key)
        except Exception:
            return {}
        if not data:
            return {}
        try:
            return json.loads(data)
        except (json.JSONDecodeError, TypeError):
            return {}
    # In-memory
    now = time.time()
    if session_id in _memory_sessions:
        data, expiry = _memory_sessions[session_id]
        if now < expiry:
            return dict(data)
        del _memory_sessions[session_id]
    return {}


def set_session(session_id: str, data: dict) -> None:
    if _use_redis():
        key = f"ussd:session:{session_id}"
        try:
            _redis().setex(key, Config.USSD_SESSION_TTL, json.dumps(data))
        except Exception:
            pass
        return
    # In-memory with TTL
    expiry = time.time() + Config.USSD_SESSION_TTL
    _memory_sessions[session_id] = (dict(data), expiry)


def _normalize_phone(raw: str) -> str:
    """Normalize to 254XXXXXXXXX."""
    raw = raw.strip().replace(" ", "").replace("-", "")
    if raw.startswith("+"):
        raw = raw[1:]
    if raw.startswith("254"):
        return raw
    if raw.startswith("0"):
        return "254" + raw[1:]
    return "254" + raw


def handle_ussd(session_id: str, phone_number: str, text: str) -> str:
    """
    Process USSD request. Returns response body for Africa's Talking (CON/END + text).
    """
    session = get_session(session_id)
    parts = (text or "").strip().split("*")
    choice = (parts[-1].strip() if parts else "").strip()

    if not choice:
        session["step"] = "main"
        set_session(session_id, session)
        return "CON Welcome to NannyChain\n1. Create account\n2. Sign in\n3. Exit"

    step = session.get("step", "main")

    if step == "main":
        if choice == "1":
            session["step"] = "register_phone"
            set_session(session_id, session)
            return "CON Enter your phone number (e.g. 254712345678)"
        if choice == "2":
            session["step"] = "login_phone"
            set_session(session_id, session)
            return "CON Enter your phone number"
        if choice == "3":
            return "END Goodbye."
        return "END Invalid option. Try again."

    if step == "register_phone":
        phone = _normalize_phone(choice)
        if len(phone) < 10:
            return "END Invalid phone number. Use format 254712345678."
        try:
            result = create_account(phone, send_sms=True)
            session["step"] = "main"
            set_session(session_id, session)
            if result.get("already_exists"):
                return f"END Account already exists. Worker ID: {result['worker_id']}"
            return f"END Account created. Worker ID: {result['worker_id']}. Check SMS for details."
        except Exception:
            return "END Registration failed. Please try again later."

    if step == "login_phone":
        phone = _normalize_phone(choice)
        from app.db.repositories import get_worker_by_phone
        worker = get_worker_by_phone(phone)
        session["step"] = "main"
        set_session(session_id, session)
        if not worker:
            return "END No account found for this number. Create an account first (option 1)."
        return f"END Signed in. Worker ID: {worker['worker_id']}"

    session["step"] = "main"
    set_session(session_id, session)
    return "END Invalid option. Try again."
