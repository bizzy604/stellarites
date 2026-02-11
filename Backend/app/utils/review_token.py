"""JWT utilities for time-limited review invitation links."""
from datetime import datetime, timedelta, timezone

from jose import jwt, JWTError

from app.config import Config

_ALGORITHM = "HS256"


def generate_review_token(engagement_id: str, reviewer_phone: str) -> str:
    """Generate a signed JWT for a review invitation link."""
    exp = datetime.now(tz=timezone.utc) + timedelta(days=Config.REVIEW_LINK_EXPIRY_DAYS)
    payload = {
        "engagement_id": engagement_id,
        "reviewer_phone": reviewer_phone,
        "exp": exp,
    }
    return jwt.encode(payload, Config.SECRET_KEY, algorithm=_ALGORITHM)


def verify_review_token(token: str) -> dict:
    """Verify a review invitation token and return its payload.

    Returns:
        dict with keys 'engagement_id' and 'reviewer_phone'.

    Raises:
        ValueError: if the token is invalid or expired.
    """
    try:
        payload = jwt.decode(token, Config.SECRET_KEY, algorithms=[_ALGORITHM])
        return {
            "engagement_id": payload["engagement_id"],
            "reviewer_phone": payload["reviewer_phone"],
        }
    except JWTError as exc:
        raise ValueError(f"Invalid or expired review token: {exc}") from exc
