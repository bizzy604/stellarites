"""Pydantic schemas for review objects."""
from pydantic import BaseModel, Field
from datetime import date

class ReviewSubmission(BaseModel):
    engagement_id: str = Field(..., description="Unique identifier for the engagement being reviewed.")
    rating: int = Field(..., ge=1, le=5, description="Rating from 1 to 5 stars.")
    comment: str = Field(..., min_length=10, max_length=500, description="Detailed comment about the review.")

class ReviewNFTResponse(BaseModel):
    asset_code: str = Field(..., description="Stellar asset code of the review NFT.")
    pdf_url: str = Field(..., description="URL to the IPFS-hosted PDF certificate.")
    stellar_tx_id: str = Field(..., description="Stellar transaction ID of the NFT minting.")
    explorer_url: str = Field(..., description="URL to view the transaction on a Stellar explorer.")
    message: str = Field(..., description="Confirmation message.")

class ReviewInviteRequest(BaseModel):
    engagement_id: str
    reviewer_phone: str


class ReviewData(BaseModel):
    rating: int
    role: str
    duration_months: int
    reviewer_type: str
    pdf_url: str
    stellar_asset: str # This would be the asset_code
    stellar_issuer: str # The issuer public key
    stellar_tx_id: str
    status: str # "claimable" or "owned"
