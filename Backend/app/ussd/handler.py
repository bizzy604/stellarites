"""USSD session and menu handler. Africa's Talking callback logic."""
import json
import redis
from app.config import Config
from app.services.user_service import create_account


def _redis():
    """
    Return a Redis client configured from Config.REDIS_URL.
    
    Returns:
        redis.Redis: A Redis client instance connected using the configured Redis URL.
    """
    return redis.from_url(Config.REDIS_URL)


def get_session(session_id: str) -> dict:
    """
    Retrieve stored USSD session data for the given session identifier.
    
    Attempts to read JSON-serialized session data from storage and decode it; returns an empty dict if no session exists or the stored data cannot be decoded.
    
    Parameters:
        session_id (str): USSD session identifier used to locate the stored session.
    
    Returns:
        dict: Decoded session data, or an empty dict if not found or invalid.
    """
    key = f"ussd:session:{session_id}"
    data = _redis().get(key)
    if not data:
        return {}
    try:
        return json.loads(data)
    except (json.JSONDecodeError, TypeError):
        return {}


def set_session(session_id: str, data: dict) -> None:
    """
    Persist USSD session data in Redis under a namespaced key with an expiration.
    
    Parameters:
        session_id (str): Identifier for the USSD session; used to construct the Redis key "ussd:session:{session_id}".
        data (dict): Session state to persist; the dictionary will be JSON-serialized before storage. The entry expires after Config.USSD_SESSION_TTL seconds.
    """
    key = f"ussd:session:{session_id}"
    _redis().setex(key, Config.USSD_SESSION_TTL, json.dumps(data))


def _normalize_phone(raw: str) -> str:
    """
    Convert a phone number into the Kenyan international format `254XXXXXXXXX`.
    
    Accepts numbers with surrounding whitespace, spaces, hyphens, a leading `+`, local format starting with `0`, or already in `254` format and returns a string beginning with `254` followed by the subscriber digits.
    
    Parameters:
    	raw (str): The raw phone input.
    
    Returns:
    	normalized (str): Phone number normalized to the `254XXXXXXXXX` format.
    """
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
    Handle an incoming USSD interaction for a session and return the appropriate Africa's Talking response.
    
    Parses the incoming USSD text, advances the session state stored in Redis, and returns a response string that begins with either "CON" (continue) or "END" (terminate) followed by the message. This function persists session state and may create a new user account or look up an existing account; account creation can trigger an SMS notification.
    
    Parameters:
    	session_id (str): Unique USSD session identifier used to load and persist session state.
    	phone_number (str): Originating caller's phone number (raw format as provided by the gateway).
    	text (str): Raw USSD payload submitted by the user (e.g., "1", "1*254712345678", or an empty string for initial requests).
    
    Returns:
    	response (str): A single-line Africa's Talking response starting with "CON" or "END" and the message to show the user.
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