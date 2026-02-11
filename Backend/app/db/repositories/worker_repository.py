"""Worker (user) repository – SQLite version."""
import uuid
from app.db import get_connection

_COLS = "id, worker_id, phone, name, role, stellar_public_key, created_at"


def _generate_worker_id() -> str:
    """Generate a unique worker identifier in the NW-XXXXXXXX format."""
    return "NW-" + uuid.uuid4().hex[:8].upper()


def create(
    phone: str,
    stellar_public_key: str,
    stellar_secret_encrypted: str,
    name: str = None,
    role: str = "worker",
) -> dict:
    """Create a new worker record and return its stored fields."""
    worker_id = _generate_worker_id()
    conn = get_connection()
    try:
        cur = conn.execute(
            f"""
            INSERT INTO workers (worker_id, phone, name, role, stellar_public_key, stellar_secret_encrypted)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (worker_id, phone, name or "", role, stellar_public_key, stellar_secret_encrypted),
        )
        conn.commit()
        # Fetch the inserted row (SQLite RETURNING requires 3.35+; use lastrowid instead for max compat)
        row = conn.execute(
            f"SELECT {_COLS} FROM workers WHERE id = ?", (cur.lastrowid,)
        ).fetchone()
        return dict(row)
    finally:
        conn.close()


def get_by_phone(phone: str) -> dict | None:
    """Retrieve a worker record by phone number."""
    conn = get_connection()
    try:
        row = conn.execute(
            f"SELECT {_COLS} FROM workers WHERE phone = ?", (phone,)
        ).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def get_by_worker_id(worker_id: str) -> dict | None:
    """Get worker by worker_id."""
    conn = get_connection()
    try:
        row = conn.execute(
            f"SELECT {_COLS} FROM workers WHERE worker_id = ?", (worker_id,)
        ).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def get_by_public_key(public_key: str) -> dict | None:
    """Get worker by Stellar public key (includes encrypted secret for signing)."""
    conn = get_connection()
    try:
        row = conn.execute(
            f"SELECT {_COLS}, stellar_secret_encrypted FROM workers WHERE stellar_public_key = ?",
            (public_key,),
        ).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()
