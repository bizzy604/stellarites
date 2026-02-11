"""User/worker account service. Creates account and maps to Stellar wallet."""
from app.integrations.stellar import create_wallet_for_user
from app.db.repositories import create_worker, get_worker_by_phone


def create_account(phone: str, name: str = None, send_sms: bool = True) -> dict:
    """
    Create a new worker account with a Stellar wallet.
    Returns dict with worker_id, stellar_public_key, phone.
    Optionally sends welcome SMS via Africa's Talking.
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
