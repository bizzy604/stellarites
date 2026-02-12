"""Service for handling review orchestration and validation."""
import hashlib
import time
from datetime import datetime, timedelta

from app.config import Config
from app.db.repositories import get_worker_by_phone, get_by_worker_id # Import get_by_worker_id
from app.integrations.africastalking.sms import send_sms
from app.integrations.ipfs import pin_to_ipfs, get_ipfs_url
from app.integrations.stellar.nft import mint_review_nft, get_reviews_for_account
from app.services.pdf import generate_review_pdf
from app.schemas.review import ReviewSubmission, ReviewData, ReviewNFTResponse
from app.utils.review_token import generate_review_token

# Placeholder for engagement data - in a real app, this would come from a DB
ENGAGEMENTS_DB = {} # {engagement_id: {"worker_phone": "...", "employer_phone": "...", "role": "...", "start_date": "...", "end_date": "...", "review_unlocked_at": datetime}}

async def submit_review(
    review_submission: ReviewSubmission,
    reviewer_phone: str # From authenticated user
) -> ReviewNFTResponse:
    """
    Orchestrates the submission of a review: generates PDF, pins to IPFS, mints NFT.
    """
    engagement_id = review_submission.engagement_id
    # 1. Load engagement and perform validation
    engagement = ENGAGEMENTS_DB.get(engagement_id)
    if not engagement:
        raise ValueError("Engagement not found.")

    worker = get_worker_by_phone(engagement["worker_phone"]) # Use get_worker_by_phone for worker associated with engagement
    if not worker:
        raise ValueError("Worker for this engagement not found.")

    # Determine reviewer type and reviewee (worker)
    reviewer_type = None
    reviewee_public_key = worker["stellar_public_key"]

    if reviewer_phone == engagement["employer_phone"]:
        reviewer_type = "employer"
    elif reviewer_phone == engagement["worker_phone"]: # Worker reviewing employer (not in current plan, but good for future)
        raise ValueError("Workers cannot review employers in this version.") # Or implement employer NFT
    else:
        raise ValueError("You are not part of this engagement.")

    # Check review unlock date
    # Use explicit unlock date from engagement if set, otherwise derive from end_date + REVIEW_UNLOCK_DAYS
    review_unlocked_at = engagement.get("review_unlocked_at")
    if review_unlocked_at is None:
        end_date_obj_check = datetime.strptime(engagement["end_date"], "%Y-%m-%d")
        review_unlocked_at = end_date_obj_check + timedelta(days=Config.REVIEW_UNLOCK_DAYS)
    if datetime.now() < review_unlocked_at:
        raise ValueError(f"Reviews unlock on {review_unlocked_at.strftime('%b %d, %Y')}.")

    # Check for duplicate reviews (by checking existing NFTs)
    existing_reviews = get_reviews_for_account(reviewee_public_key)
    for review in existing_reviews:
        # Assuming engagement_id can be stored in some part of the NFT metadata or derived from asset_code_suffix
        # For simplicity, if we find any RVW NFT, assume it's for this engagement for now.
        # A more robust solution would embed engagement_id in NFT manage_data or asset_code suffix.
        pass # Placeholder for actual duplicate check logic

    # Prepare review data for PDF
    review_date = datetime.now().strftime("%b %d, %Y")
    start_date_obj = datetime.strptime(engagement["start_date"], "%Y-%m-%d")
    end_date_obj = datetime.strptime(engagement["end_date"], "%Y-%m-%d")
    duration_months = (end_date_obj.year - start_date_obj.year) * 12 + (end_date_obj.month - start_date_obj.month)

    # Mock worker name for PDF - in real app would get from worker_repo
    worker_name = worker.get("name", "N/A")
    if not worker_name:
        worker_name = f"Worker {worker['worker_id']}"

    pdf_review_data = {
        "worker_name": worker_name,
        "worker_code": worker["worker_id"],
        "role": engagement["role"],
        "start_date": engagement["start_date"],
        "end_date": engagement["end_date"],
        "duration_months": duration_months,
        "rating": review_submission.rating,
        "comment": review_submission.comment,
        "reviewer_type": reviewer_type,
        "review_date": review_date,
        "stellar_tx_id": "pending", # Will be updated after mint
        "explorer_url": "pending" # Will be updated after mint
    }

    # 2. Generate PDF certificate
    pdf_bytes = generate_review_pdf(pdf_review_data)

    # 3. Pin PDF to IPFS
    pdf_cid = await pin_to_ipfs(pdf_bytes)
    pdf_url = get_ipfs_url(pdf_cid)
    pdf_review_data["pdf_cid"] = pdf_cid # Add to data for NFT metadata

    # 4. Mint Stellar NFT with Claimable Balance
    # Generate a unique suffix for the asset code (e.g., from a hash of engagement_id + timestamp)
    asset_code_suffix = hashlib.sha256(f"{engagement_id}-{time.time()}".encode()).hexdigest()[:9]

    # Prepare metadata for ManageData
    nft_metadata = {
        "rating": review_submission.rating,
        "reviewer_type": reviewer_type,
        "role": engagement["role"],
        "duration": duration_months,
        # Other fields can be added from pdf_review_data if needed
    }

    mint_result = mint_review_nft(
        reviewee_public_key=reviewee_public_key,
        pdf_cid=pdf_cid,
        asset_code_suffix=asset_code_suffix,
        metadata=nft_metadata
    )

    # Update PDF data with actual tx info
    pdf_review_data["stellar_tx_id"] = mint_result["transaction_id"]
    pdf_review_data["explorer_url"] = mint_result["explorer_url"]

    return ReviewNFTResponse(
        asset_code=mint_result["asset_code"],
        pdf_url=pdf_url,
        stellar_tx_id=mint_result["transaction_id"],
        explorer_url=mint_result["explorer_url"],
        message="Review certificate minted as NFT on Stellar (Claimable Balance)."
    )

async def send_review_invitation(engagement_id: str, reviewer_phone: str) -> bool:
    """Send an SMS with a time-limited review link to the reviewer."""
    token = generate_review_token(engagement_id, reviewer_phone)
    link = f"{Config.REVIEW_FRONTEND_URL}?token={token}"
    message = (
        f"Your review for engagement {engagement_id} is ready. "
        f"Submit it here (link expires in {Config.REVIEW_LINK_EXPIRY_DAYS} days): {link}"
    )
    return send_sms(reviewer_phone, message)


async def get_worker_reviews(worker_code: str) -> list[ReviewData]:
    """
    Fetches all reviews for a given worker code.
    """
    worker = get_by_worker_id(worker_code) # Use get_by_worker_id here
    if not worker:
        raise ValueError("Worker not found.")

    stellar_public_key = worker["stellar_public_key"]
    nft_records = get_reviews_for_account(stellar_public_key)

    reviews_data = []
    for record in nft_records:
        pdf_url = get_ipfs_url(record["pdf_cid"])
        reviews_data.append(ReviewData(
            rating=int(record["rating"]),
            role=record["role"],
            duration_months=int(record["duration"]),
            reviewer_type=record["reviewer_type"],
            pdf_url=pdf_url,
            stellar_asset=record["asset_code"],
            stellar_issuer=record["issuer_public_key"],
            stellar_tx_id="N/A", # Transaction ID of minting not directly in manage data, would require Horizon queries
            status=record["status"]
        ))
    return reviews_data
