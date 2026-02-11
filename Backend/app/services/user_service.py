"""User/worker account service. Creates account and maps to Stellar wallet."""
from app.integrations.stellar import create_wallet_for_user
from app.db.repositories import create_worker, get_worker_by_phone


def create_account(phone: str, name: str = None, send_sms: bool = True) -> dict:
    """
    Create a worker account and associate a Stellar wallet.
    
    If a worker with the given phone already exists, returns that worker's identifiers. Otherwise creates a new Stellar wallet and worker record; when send_sms is True a welcome SMS is attempted (SMS failures are ignored).
    
    Parameters:
        phone (str): Phone number used to identify or create the worker.
        name (str, optional): Worker display name; defaults to an empty string when not provided.
        send_sms (bool, optional): If True, attempt to send a welcome SMS after creating a new worker.
    
    Returns:
        dict: {
            "worker_id": str,              # database id of the existing or newly created worker
            "stellar_public_key": str,     # associated Stellar public key
            "phone": str,                  # worker phone number
            "already_exists": bool         # True if worker was found and no new account was created, False otherwise
        }
    """
    worker = get_worker_by_phone(phone)
    if worker:
        return {
            "worker_id": worker["worker_id"],
            "stellar_public_key": worker["stellar_public_key"],
            "phone": worker["phone"],
            "already_exists": True,
        }

    public_key, encrypted_secret = create_wallet_for_user()
    row = create_worker(
        phone=phone,
        name=name or "",
        stellar_public_key=public_key,
        stellar_secret_encrypted=encrypted_secret,
    )

    if send_sms:
        try:
            from app.integrations.africastalking import send_sms
            msg = f"NannyChain: Your Worker ID is {row['worker_id']}. Stellar wallet: {public_key[:12]}..."
            send_sms(phone, msg)
        except Exception:
            pass

    return {
        "worker_id": row["worker_id"],
        "stellar_public_key": row["stellar_public_key"],
        "phone": row["phone"],
        "already_exists": False,
    }