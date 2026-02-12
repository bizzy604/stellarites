"""Scheduled payments repository – SQLite."""
import uuid
from datetime import datetime, timedelta
from app.db import get_connection

_COLS = "id, schedule_id, employer_id, worker_id, amount, frequency, next_payment_date, status, memo, created_at"


def _generate_schedule_id() -> str:
    return "SP-" + uuid.uuid4().hex[:8].upper()


def _advance_date(current_date: str, frequency: str) -> str:
    """Return the next payment date string (YYYY-MM-DD) based on frequency."""
    dt = datetime.strptime(current_date[:10], "%Y-%m-%d")
    if frequency == "weekly":
        dt += timedelta(weeks=1)
    elif frequency == "biweekly":
        dt += timedelta(weeks=2)
    else:  # monthly
        month = dt.month + 1
        year = dt.year
        if month > 12:
            month = 1
            year += 1
        day = min(dt.day, 28)  # safe for all months
        dt = dt.replace(year=year, month=month, day=day)
    return dt.strftime("%Y-%m-%d")


def create(
    employer_id: str,
    worker_id: str,
    amount: str,
    frequency: str = "monthly",
    next_payment_date: str = "",
    memo: str = "",
) -> dict:
    """Create a new scheduled payment."""
    schedule_id = _generate_schedule_id()
    if not next_payment_date:
        next_payment_date = datetime.utcnow().strftime("%Y-%m-%d")
    conn = get_connection()
    try:
        conn.execute(
            f"""INSERT INTO scheduled_payments
                (schedule_id, employer_id, worker_id, amount, frequency, next_payment_date, memo)
                VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (schedule_id, employer_id, worker_id, amount, frequency, next_payment_date, memo),
        )
        conn.commit()
        row = conn.execute(
            f"SELECT {_COLS} FROM scheduled_payments WHERE schedule_id = ?",
            (schedule_id,),
        ).fetchone()
        return dict(row)
    finally:
        conn.close()


def get_by_employer(employer_id: str) -> list[dict]:
    """Get all schedules created by an employer."""
    conn = get_connection()
    try:
        rows = conn.execute(
            f"SELECT {_COLS} FROM scheduled_payments WHERE employer_id = ? ORDER BY next_payment_date ASC",
            (employer_id,),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def get_for_worker(worker_id: str) -> list[dict]:
    """Get active schedules targeting a worker."""
    conn = get_connection()
    try:
        rows = conn.execute(
            f"SELECT {_COLS} FROM scheduled_payments WHERE worker_id = ? AND status = 'active' ORDER BY next_payment_date ASC",
            (worker_id,),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def get_due() -> list[dict]:
    """Get all active schedules whose next_payment_date <= today."""
    today = datetime.utcnow().strftime("%Y-%m-%d")
    conn = get_connection()
    try:
        rows = conn.execute(
            f"SELECT {_COLS} FROM scheduled_payments WHERE status = 'active' AND next_payment_date <= ?",
            (today,),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def advance_next_date(schedule_id: str) -> None:
    """Move the schedule forward to the next payment date based on its frequency."""
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT next_payment_date, frequency FROM scheduled_payments WHERE schedule_id = ?",
            (schedule_id,),
        ).fetchone()
        if not row:
            return
        new_date = _advance_date(row["next_payment_date"], row["frequency"])
        conn.execute(
            "UPDATE scheduled_payments SET next_payment_date = ? WHERE schedule_id = ?",
            (new_date, schedule_id),
        )
        conn.commit()
    finally:
        conn.close()


def update_status(schedule_id: str, status: str) -> dict | None:
    """Update a schedule's status (active/paused/cancelled)."""
    conn = get_connection()
    try:
        conn.execute(
            "UPDATE scheduled_payments SET status = ? WHERE schedule_id = ?",
            (status, schedule_id),
        )
        conn.commit()
        row = conn.execute(
            f"SELECT {_COLS} FROM scheduled_payments WHERE schedule_id = ?",
            (schedule_id,),
        ).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def get_by_id(schedule_id: str) -> dict | None:
    """Get a single schedule by its ID."""
    conn = get_connection()
    try:
        row = conn.execute(
            f"SELECT {_COLS} FROM scheduled_payments WHERE schedule_id = ?",
            (schedule_id,),
        ).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()
