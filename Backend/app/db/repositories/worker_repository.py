"""Worker (user) repository for NannyChain."""
import uuid
from app.db import get_connection


def _generate_worker_id() -> str:
    """Generate unique worker ID in format NW-XXXX (alphanumeric)."""
    return "NW-" + uuid.uuid4().hex[:8].upper()


def create(phone: str, stellar_public_key: str, stellar_secret_encrypted: str, name: str = None) -> dict:
    """Create a new worker. Returns worker dict with worker_id."""
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
    """Get worker by phone. Returns None if not found."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, worker_id, phone, name, stellar_public_key, created_at FROM workers WHERE phone = %s",
                (phone,),
            )
            row = cur.fetchone()
            return dict(row) if row else None
