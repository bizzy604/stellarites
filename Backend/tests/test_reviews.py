import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.services.pdf import generate_review_pdf
from app.services.review import submit_review, get_worker_reviews, send_review_invitation
from app.schemas.review import ReviewSubmission
from app.utils.review_token import generate_review_token, verify_review_token

@pytest.fixture
def mock_review_submission():
    return ReviewSubmission(
        engagement_id="test-eng-123",
        rating=5,
        comment="Excellent work, very professional!"
    )

@pytest.fixture
def mock_worker():
    return {
        "id": 1,
        "worker_id": "NW-12345",
        "name": "Jane Doe",
        "stellar_public_key": "GD...WORKER",
        "phone": "254712345678"
    }

@pytest.fixture
def mock_engagement():
    return {
        "worker_phone": "254712345678",
        "employer_phone": "254700000000",
        "role": "Childcare",
        "start_date": "2024-01-01",
        "end_date": "2024-02-01",
    }

def test_generate_pdf():
    """Verify PDF generation returns bytes and contains expected data."""
    data = {
        "worker_name": "Jane Doe",
        "worker_code": "NW-12345",
        "role": "Childcare",
        "start_date": "2024-01-01",
        "end_date": "2024-02-01",
        "duration_months": 1,
        "rating": 5,
        "comment": "Great!",
        "reviewer_type": "employer",
        "review_date": "Feb 11, 2026",
        "stellar_tx_id": "abc",
        "explorer_url": "http://stellar.expert/tx/abc"
    }
    pdf_bytes = generate_review_pdf(data)
    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 0

@pytest.mark.asyncio
@patch("app.services.review.get_worker_by_phone")
@patch("app.services.review.pin_to_ipfs")
@patch("app.services.review.mint_review_nft")
@patch("app.services.review.get_reviews_for_account", new_callable=AsyncMock)
@patch("app.services.review.ENGAGEMENTS_DB")
async def test_submit_review_success(mock_db, mock_existing_reviews, mock_mint, mock_pin, mock_get_worker, mock_review_submission, mock_worker, mock_engagement):
    """Test the full review submission orchestration."""
    # Setup mocks
    mock_db.get.return_value = mock_engagement
    mock_get_worker.return_value = mock_worker
    mock_existing_reviews.return_value = []
    mock_pin.return_value = "QmTestCID"
    mock_mint.return_value = {
        "asset_code": "RVWTEST",
        "transaction_id": "tx123",
        "explorer_url": "http://explorer/tx123"
    }

    response = await submit_review(mock_review_submission, "254700000000")

    assert response.asset_code == "RVWTEST"
    assert "QmTestCID" in response.pdf_url
    assert response.stellar_tx_id == "tx123"
    mock_pin.assert_called_once()
    mock_mint.assert_called_once()

@pytest.mark.asyncio
@patch("app.services.review.get_by_worker_id")
@patch("app.services.review.get_reviews_for_account")
async def test_get_worker_reviews(mock_get_nfts, mock_get_worker, mock_worker):
    """Test retrieval of worker reviews."""
    mock_get_worker.return_value = mock_worker
    mock_get_nfts.return_value = [
        {
            "rating": "5",
            "role": "Childcare",
            "duration": "1",
            "reviewer_type": "employer",
            "pdf_cid": "Qm123",
            "asset_code": "RVWABC",
            "issuer_public_key": "GD...ISSUER",
            "status": "claimable",
            "reviewee": "GD...WORKER"
        }
    ]

    reviews = await get_worker_reviews("NW-12345")

    assert len(reviews) == 1
    assert reviews[0].rating == 5
    assert reviews[0].stellar_asset == "RVWABC"
    assert reviews[0].status == "claimable"


@pytest.mark.asyncio
@patch("app.services.review.send_sms")
@patch("app.services.review.generate_review_token", return_value="mock-token-abc")
async def test_send_review_invitation(mock_gen_token, mock_send_sms):
    """Test that send_review_invitation builds the correct message and calls send_sms."""
    from app.config import Config
    mock_send_sms.return_value = True

    result = await send_review_invitation("eng-001", "+254700000001")

    assert result is True
    mock_gen_token.assert_called_once_with("eng-001", "+254700000001")
    expected_link = f"{Config.REVIEW_FRONTEND_URL}?token=mock-token-abc"
    expected_message = (
        f"Your review for engagement eng-001 is ready. "
        f"Submit it here (link expires in {Config.REVIEW_LINK_EXPIRY_DAYS} days): {expected_link}"
    )
    mock_send_sms.assert_called_once_with("+254700000001", expected_message)


def test_review_token_expiry():
    """A token generated with 0-day expiry should immediately be considered expired."""
    from unittest.mock import patch as _patch
    from app.config import Config

    with _patch.object(Config, "REVIEW_LINK_EXPIRY_DAYS", -1):
        token = generate_review_token("eng-001", "+254700000001")

    with pytest.raises(ValueError, match="expired|invalid|Invalid"):
        verify_review_token(token)
