"""Reviews repository – SQLite."""
import uuid
from datetime import datetime, timedelta
from app.db import get_connection

_COLS = "id, review_id, reviewer_id, reviewee_id, reviewer_role, rating, comment, schedule_id, stellar_tx_hash, explorer_url, nft_asset_code, created_at"

REVIEW_ELIGIBILITY_DAYS = 0  # TODO: restore to 90 (3 months) after demo


def _generate_review_id() -> str:
    return "RV-" + uuid.uuid4().hex[:8].upper()


def get_eligible_reviewees(user_id: str, user_role: str) -> list[dict]:
    """
    Return people this user can review.

    Eligibility: a scheduled_payment relationship that was created >= 90 days ago,
    and the user has NOT already reviewed that person for that schedule.

    - If user_role == 'employer': they can review workers they pay
    - If user_role == 'worker': they can review employers who pay them
    """
    cutoff = (datetime.utcnow() - timedelta(days=REVIEW_ELIGIBILITY_DAYS)).strftime(
        "%Y-%m-%d %H:%M:%S"
    )
    conn = get_connection()
    try:
        if user_role == "employer":
            # Employer reviews workers they have scheduled payments for
            rows = conn.execute(
                """
                SELECT DISTINCT sp.worker_id AS reviewee_id,
                       sp.schedule_id,
                       sp.created_at AS relationship_since,
                       w.name AS reviewee_name,
                       w.role AS reviewee_role
                FROM scheduled_payments sp
                JOIN workers w ON w.worker_id = sp.worker_id
                WHERE sp.employer_id = ?
                  AND sp.created_at <= ?
                  AND sp.schedule_id NOT IN (
                      SELECT r.schedule_id FROM reviews r
                      WHERE r.reviewer_id = ? AND r.schedule_id IS NOT NULL
                  )
                """,
                (user_id, cutoff, user_id),
            ).fetchall()
        else:
            # Worker reviews employers who pay them
            rows = conn.execute(
                """
                SELECT DISTINCT sp.employer_id AS reviewee_id,
                       sp.schedule_id,
                       sp.created_at AS relationship_since,
                       w.name AS reviewee_name,
                       w.role AS reviewee_role
                FROM scheduled_payments sp
                JOIN workers w ON w.worker_id = sp.employer_id
                WHERE sp.worker_id = ?
                  AND sp.created_at <= ?
                  AND sp.schedule_id NOT IN (
                      SELECT r.schedule_id FROM reviews r
                      WHERE r.reviewer_id = ? AND r.schedule_id IS NOT NULL
                  )
                """,
                (user_id, cutoff, user_id),
            ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def create(
    reviewer_id: str,
    reviewee_id: str,
    reviewer_role: str,
    rating: int,
    comment: str = "",
    schedule_id: str | None = None,
) -> dict:
    """Create a new review after validating the 3-month eligibility."""
    review_id = _generate_review_id()
    conn = get_connection()
    try:
        conn.execute(
            """INSERT INTO reviews
               (review_id, reviewer_id, reviewee_id, reviewer_role, rating, comment, schedule_id)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (review_id, reviewer_id, reviewee_id, reviewer_role, rating, comment, schedule_id),
        )
        conn.commit()
        row = conn.execute(
            f"SELECT {_COLS} FROM reviews WHERE review_id = ?",
            (review_id,),
        ).fetchone()
        return dict(row)
    finally:
        conn.close()


def update_nft_data(review_id: str, stellar_tx_hash: str, explorer_url: str, nft_asset_code: str) -> dict | None:
    """Update a review record with Stellar NFT data after minting."""
    conn = get_connection()
    try:
        conn.execute(
            "UPDATE reviews SET stellar_tx_hash = ?, explorer_url = ?, nft_asset_code = ? WHERE review_id = ?",
            (stellar_tx_hash, explorer_url, nft_asset_code, review_id),
        )
        conn.commit()
        row = conn.execute(
            f"SELECT {_COLS} FROM reviews WHERE review_id = ?",
            (review_id,),
        ).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def get_reviews_for(reviewee_id: str) -> list[dict]:
    """Get all reviews written about a user."""
    conn = get_connection()
    try:
        rows = conn.execute(
            f"""SELECT r.{_COLS.replace('id,', 'r.id,')},
                       w.name AS reviewer_name
                FROM reviews r
                JOIN workers w ON w.worker_id = r.reviewer_id
                WHERE r.reviewee_id = ?
                ORDER BY r.created_at DESC""",
            (reviewee_id,),
        ).fetchall()
        return [dict(r) for r in rows]
    except Exception:
        # Fallback without join if workers table issues
        rows = conn.execute(
            f"SELECT {_COLS} FROM reviews WHERE reviewee_id = ? ORDER BY created_at DESC",
            (reviewee_id,),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def get_reviews_by(reviewer_id: str) -> list[dict]:
    """Get all reviews written by a user."""
    conn = get_connection()
    try:
        rows = conn.execute(
            f"""SELECT r.{_COLS.replace('id,', 'r.id,')},
                       w.name AS reviewee_name
                FROM reviews r
                JOIN workers w ON w.worker_id = r.reviewee_id
                WHERE r.reviewer_id = ?
                ORDER BY r.created_at DESC""",
            (reviewer_id,),
        ).fetchall()
        return [dict(r) for r in rows]
    except Exception:
        rows = conn.execute(
            f"SELECT {_COLS} FROM reviews WHERE reviewer_id = ? ORDER BY created_at DESC",
            (reviewer_id,),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def get_average_rating(reviewee_id: str) -> dict:
    """Return average rating and count for a user."""
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT AVG(rating) as avg_rating, COUNT(*) as count FROM reviews WHERE reviewee_id = ?",
            (reviewee_id,),
        ).fetchone()
        return {
            "avg_rating": round(row["avg_rating"], 1) if row["avg_rating"] else 0,
            "count": row["count"] or 0,
        }
    finally:
        conn.close()


def has_relationship(user_id: str, other_id: str) -> bool:
    """Check if there's any scheduled payment relationship between two users (either direction)."""
    cutoff = (datetime.utcnow() - timedelta(days=REVIEW_ELIGIBILITY_DAYS)).strftime(
        "%Y-%m-%d %H:%M:%S"
    )
    conn = get_connection()
    try:
        row = conn.execute(
            """SELECT COUNT(*) as cnt FROM scheduled_payments
               WHERE ((employer_id = ? AND worker_id = ?) OR (employer_id = ? AND worker_id = ?))
                 AND created_at <= ?""",
            (user_id, other_id, other_id, user_id, cutoff),
        ).fetchone()
        return row["cnt"] > 0
    finally:
        conn.close()
