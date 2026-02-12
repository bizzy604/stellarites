"""Payment claims repository – SQLite."""
import uuid
from app.db import get_connection

_COLS = "id, claim_id, schedule_id, worker_id, employer_id, amount, message, status, created_at"


def _generate_claim_id() -> str:
    return "CL-" + uuid.uuid4().hex[:8].upper()


def create(
    worker_id: str,
    employer_id: str,
    amount: str,
    message: str = "",
    schedule_id: str | None = None,
) -> dict:
    """Create a new payment claim from a worker to an employer."""
    claim_id = _generate_claim_id()
    conn = get_connection()
    try:
        conn.execute(
            """INSERT INTO payment_claims
               (claim_id, schedule_id, worker_id, employer_id, amount, message)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (claim_id, schedule_id, worker_id, employer_id, amount, message),
        )
        conn.commit()
        row = conn.execute(
            f"SELECT {_COLS} FROM payment_claims WHERE claim_id = ?",
            (claim_id,),
        ).fetchone()
        return dict(row)
    finally:
        conn.close()


def get_by_employer(employer_id: str) -> list[dict]:
    """Get all claims addressed to an employer."""
    conn = get_connection()
    try:
        rows = conn.execute(
            f"SELECT {_COLS} FROM payment_claims WHERE employer_id = ? ORDER BY created_at DESC",
            (employer_id,),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def get_by_worker(worker_id: str) -> list[dict]:
    """Get all claims submitted by a worker."""
    conn = get_connection()
    try:
        rows = conn.execute(
            f"SELECT {_COLS} FROM payment_claims WHERE worker_id = ? ORDER BY created_at DESC",
            (worker_id,),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def update_status(claim_id: str, status: str) -> dict | None:
    """Update a claim status (pending/approved/rejected/paid)."""
    conn = get_connection()
    try:
        conn.execute(
            "UPDATE payment_claims SET status = ? WHERE claim_id = ?",
            (status, claim_id),
        )
        conn.commit()
        row = conn.execute(
            f"SELECT {_COLS} FROM payment_claims WHERE claim_id = ?",
            (claim_id,),
        ).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def get_by_id(claim_id: str) -> dict | None:
    """Get a single claim by its ID."""
    conn = get_connection()
    try:
        row = conn.execute(
            f"SELECT {_COLS} FROM payment_claims WHERE claim_id = ?",
            (claim_id,),
        ).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()
