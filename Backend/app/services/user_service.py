"""User/worker account service. Creates account and maps to Stellar wallet."""
from app.integrations.stellar import create_wallet_for_user
from app.db.repositories import create_worker, get_worker_by_phone


def create_account(phone: str, name: str = None, role: str = "worker", send_sms: bool = True) -> dict:
    """
    Create an account and associate a Stellar wallet.

    If an account with the given phone already exists, returns that account's
    identifiers (including role).  Otherwise creates a new Stellar wallet and
    record; when *send_sms* is True a welcome SMS is attempted (failures are
    silently ignored).

    Returns:
        dict with worker_id, stellar_public_key, phone, name, role,
        already_exists.
    """
    worker = get_worker_by_phone(phone)
    if worker:
        return {
            "worker_id": worker["worker_id"],
            "stellar_public_key": worker["stellar_public_key"],
            "phone": worker["phone"],
            "name": worker.get("name", ""),
            "role": worker.get("role", "worker"),
            "already_exists": True,
        }

    public_key, encrypted_secret = create_wallet_for_user()
    row = create_worker(
        phone=phone,
        name=name or "",
        role=role,
        stellar_public_key=public_key,
        stellar_secret_encrypted=encrypted_secret,
    )

    if send_sms:
        try:
            from app.integrations.africastalking import send_sms
            msg = f"NannyChain: Your ID is {row['worker_id']}. Stellar wallet: {public_key[:12]}..."
            send_sms(phone, msg)
        except Exception:
            pass

    return {
        "worker_id": row["worker_id"],
        "stellar_public_key": row["stellar_public_key"],
        "phone": row["phone"],
        "name": row.get("name", ""),
        "role": row.get("role", role),
        "already_exists": False,
    }