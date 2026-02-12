"""FastAPI router for review endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.schemas.review import ReviewInviteRequest, ReviewSubmission, ReviewNFTResponse, ReviewData
from app.services.review import send_review_invitation, submit_review, get_worker_reviews
from app.utils.review_token import verify_review_token
from app.db.repositories import get_worker_by_phone

router = APIRouter()

# Placeholder for current user for now, until auth is implemented
# In a real app, this would be a dependency like Depends(get_current_user)
# For now, we'll mock it or pass a fixed value for testing.
async def get_current_user_phone_mock():
    # Placeholder: In a real app, this would come from JWT or session
    # For now, return a hardcoded phone that is an employer in your ENGAGEMENTS_DB mock
    return "254700000000" # Example employer phone

@router.post("/reviews/invite")
async def invite_reviewer(body: ReviewInviteRequest):
    """
    Trigger a time-limited review invitation SMS.
    Called by the engagement system when a review unlock date is reached.
    """
    sent = await send_review_invitation(body.engagement_id, body.reviewer_phone)
    return {"sent": sent}

@router.post("/reviews", response_model=ReviewNFTResponse, status_code=status.HTTP_201_CREATED)
async def create_review(
    review_submission: ReviewSubmission,
    token: str = Query(None),
    current_user_phone: str = Depends(get_current_user_phone_mock)
):
    """
    Submits a new review, generates a PDF certificate, pins it to IPFS,
    and mints a Stellar NFT (Claimable Balance).

    If a `token` query parameter is present it is validated and the reviewer
    phone is extracted from it; otherwise the mock dependency is used.
    """
    if token is not None:
        try:
            token_data = verify_review_token(token)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc))
        current_user_phone = token_data["reviewer_phone"]

    try:
        response = await submit_review(review_submission, current_user_phone)
        return response
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        # Log the error for debugging
        print(f"Error creating review: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not create review due to an internal error.")

@router.get("/reviews/worker/{worker_code}", response_model=list[ReviewData])
async def get_worker_reviews_endpoint(worker_code: str):
    """
    Fetches all review NFTs for a given worker.
    """
    try:
        reviews = await get_worker_reviews(worker_code)
        return reviews
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        print(f"Error fetching worker reviews: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not retrieve reviews due to an internal error.")

# Placeholder for employer reviews (from review plan)
@router.get("/reviews/employer/{employer_id}", response_model=list[ReviewData])
async def get_employer_reviews_endpoint(employer_id: str):
    """
    Fetches all review NFTs given by a particular employer.
    NOTE: This endpoint is a placeholder and requires more robust implementation
    to fetch employer-specific reviews (e.g., from a 'reviewer' field in NFT metadata).
    """
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Employer review fetching is not yet implemented.")
