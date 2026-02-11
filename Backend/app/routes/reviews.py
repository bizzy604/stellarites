"""
Review Routes

Practical review system using SQLite.
Workers review employers and employers review workers,
only after a 3-month working relationship (via scheduled payments).
"""
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List

from app.db.repositories import review_repository, get_by_worker_id

router = APIRouter(tags=["Reviews"])


# ── Pydantic models ──────────────────────────────────────────────────────────

class EligibleReviewee(BaseModel):
    reviewee_id: str
    reviewee_name: str
    reviewee_role: str
    schedule_id: str
    relationship_since: str


class SubmitReviewRequest(BaseModel):
    reviewer_id: str        # NW-XXXX (the person writing the review)
    reviewee_id: str        # NW-XXXX (the person being reviewed)
    rating: int             # 1–5
    comment: str = ""
    schedule_id: Optional[str] = None  # ties review to a specific schedule


class ReviewResponse(BaseModel):
    id: int
    review_id: str
    reviewer_id: str
    reviewee_id: str
    reviewer_role: str
    rating: int
    comment: str
    schedule_id: Optional[str] = None
    created_at: str
    reviewer_name: Optional[str] = None
    reviewee_name: Optional[str] = None


class RatingResponse(BaseModel):
    avg_rating: float
    count: int


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/reviews/eligible/{user_id}", response_model=List[EligibleReviewee])
def get_eligible_reviewees(user_id: str):
    """
    List people this user can review.
    Only returns relationships that are >= 3 months old
    and haven't already been reviewed by this user.
    """
    user_row = get_by_worker_id(user_id.upper())
    if not user_row:
        raise HTTPException(status_code=404, detail=f"User '{user_id}' not found.")
    role = user_row["role"]
    eligible = review_repository.get_eligible_reviewees(user_id.upper(), role)
    return [EligibleReviewee(**e) for e in eligible]


@router.post("/reviews/submit", response_model=ReviewResponse, status_code=201)
def submit_review(req: SubmitReviewRequest):
    """
    Submit a review. Enforces 3-month relationship rule.
    """
    # Validate rating
    if req.rating < 1 or req.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5.")

    # Validate both users exist
    reviewer = get_by_worker_id(req.reviewer_id.upper())
    if not reviewer:
        raise HTTPException(status_code=404, detail=f"Reviewer '{req.reviewer_id}' not found.")

    reviewee = get_by_worker_id(req.reviewee_id.upper())
    if not reviewee:
        raise HTTPException(status_code=404, detail=f"Reviewee '{req.reviewee_id}' not found.")

    # Ensure they have different roles
    if reviewer["role"] == reviewee["role"]:
        raise HTTPException(
            status_code=400,
            detail="Reviews must be between an employer and a worker.",
        )

    # Enforce 3-month relationship
    if not review_repository.has_relationship(req.reviewer_id.upper(), req.reviewee_id.upper()):
        raise HTTPException(
            status_code=403,
            detail="You can only review someone after a 3-month working relationship.",
        )

    # Create the review
    try:
        row = review_repository.create(
            reviewer_id=req.reviewer_id.upper(),
            reviewee_id=req.reviewee_id.upper(),
            reviewer_role=reviewer["role"],
            rating=req.rating,
            comment=req.comment,
            schedule_id=req.schedule_id,
        )
        return ReviewResponse(**row)
    except Exception as e:
        if "UNIQUE constraint" in str(e):
            raise HTTPException(
                status_code=409,
                detail="You have already reviewed this person for this schedule.",
            )
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reviews/for/{user_id}", response_model=List[ReviewResponse])
def get_reviews_about(user_id: str):
    """Get all reviews written about a user (received reviews)."""
    rows = review_repository.get_reviews_for(user_id.upper())
    return [ReviewResponse(**r) for r in rows]


@router.get("/reviews/by/{user_id}", response_model=List[ReviewResponse])
def get_reviews_written_by(user_id: str):
    """Get all reviews written by a user."""
    rows = review_repository.get_reviews_by(user_id.upper())
    return [ReviewResponse(**r) for r in rows]


@router.get("/reviews/rating/{user_id}", response_model=RatingResponse)
def get_user_rating(user_id: str):
    """Get the average rating and total review count for a user."""
    result = review_repository.get_average_rating(user_id.upper())
    return RatingResponse(**result)
