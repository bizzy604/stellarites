"""Worker (user) repository for NannyChain."""
import uuid
from app.db import get_connection


def _generate_worker_id() -> str:
    """
    Generate a unique worker identifier in the NW-XXXXXXXX format.
    
    Returns:
        worker_id (str): Worker ID string starting with "NW-" followed by eight uppercase hexadecimal characters.
    """
    return "NW-" + uuid.uuid4().hex[:8].upper()


def create(phone: str, stellar_public_key: str, stellar_secret_encrypted: str, name: str = None) -> dict:
    """
    Create a new worker record and return the inserted worker's stored fields.
    
    Parameters:
        phone (str): Worker phone number.
        stellar_public_key (str): Worker Stellar public key.
        stellar_secret_encrypted (str): Encrypted Stellar secret for the worker.
        name (str, optional): Worker name. Empty string is stored if None.
    
    Returns:
        dict: Inserted worker fields: `id`, `worker_id`, `phone`, `name`, `stellar_public_key`, and `created_at`.
    """
    worker_id = _generate_worker_id()
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO workers (worker_id, phone, name, stellar_public_key, stellar_secret_encrypted)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id, worker_id, phone, name, stellar_public_key, created_at
                """,
                (worker_id, phone, name or "", stellar_public_key, stellar_secret_encrypted),
            )
            row = cur.fetchone()
            conn.commit()
            return dict(row)


def get_by_phone(phone: str) -> dict | None:
    """
    Retrieve a worker record by phone number.
    
    Returns:
        A dict containing the worker fields `id`, `worker_id`, `phone`, `name`, `stellar_public_key`, and `created_at` if a matching row exists, `None` otherwise.
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, worker_id, phone, name, stellar_public_key, created_at FROM workers WHERE phone = %s",
                (phone,),
            )
            row = cur.fetchone()
            return dict(row) if row else None