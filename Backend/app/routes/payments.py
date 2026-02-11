"""
Payment Routes

Payment history and recording endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

from app.services.payments import get_payment_service, PaymentService
from app.middlewares.auth_middleware import get_current_user
from app.utils.validators import validate_stellar_public_key
from app.utils.stellar_helpers import build_stellar_explorer_url
from app.utils.exceptions import ValidationError, StellarError
from app.db.repositories import get_worker_by_public_key, get_by_worker_id
from app.integrations.stellar import decrypt_secret
from pydantic import BaseModel
from app.config import get_settings
from stellar_sdk import Keypair
from datetime import datetime, timedelta
from uuid import uuid4
import traceback

router = APIRouter(prefix="/payments", tags=["Payments"])

settings = get_settings()


# Request models
class DepositCreateRequest(BaseModel):
    amount: str
    asset_code: Optional[str] = None


class DepositCreateResponse(BaseModel):
    platform_public: str
    memo: str
    amount: str
    expires_at: datetime


class DepositVerifyRequest(BaseModel):
    memo: str


class WithdrawRequest(BaseModel):
    destination: str
    amount: str


class SendPaymentRequest(BaseModel):
    """Accept either a Stellar public key (G…) or a worker ID (NW-XXXX)."""
    sender: str                      # G… public key  OR  NW-XXXX worker ID
    destination: str                 # G… public key  OR  NW-XXXX worker ID
    amount: str
    memo: Optional[str] = None


class SendPaymentResponse(BaseModel):
    successful: bool
    tx_hash: Optional[str] = None
    explorer_url: str = ""
    amount: str
    from_account: str               # resolved Stellar public key
    to_account: str                  # resolved Stellar public key
    from_worker_id: Optional[str] = None
    to_worker_id: Optional[str] = None


# Response Models
class PaymentRecord(BaseModel):
    """Single payment record."""
    id: str
    from_account: str
    to_account: str
    from_worker_id: Optional[str] = None
    to_worker_id: Optional[str] = None
    amount: str
    asset_type: str
    asset_code: Optional[str] = None
    created_at: str
    transaction_hash: str
    explorer_url: str


class PaymentHistoryResponse(BaseModel):
    """Payment history response."""
    payments: List[PaymentRecord]
    total_count: int
    cursor: Optional[str] = None


class PaymentStatsResponse(BaseModel):
    """Payment statistics response."""
    total_received: float
    total_sent: float
    received_count: int
    sent_count: int
    unique_senders: int
    unique_recipients: int


class OfframpRequest(BaseModel):
    """Off-ramp KSH from Stellar to M-Pesa."""
    sender: str              # Worker ID (NW-XXXX) or Stellar public key
    phone: str               # M-Pesa phone number (0712..., +254712..., 254712...)
    amount: str              # KSH amount to off-ramp


class OfframpResponse(BaseModel):
    success: bool
    stellar_tx_hash: Optional[str] = None
    stellar_explorer_url: Optional[str] = None
    mpesa_transaction_id: str = ""
    phone: str
    amount_ksh: str
    amount_kes: str
    exchange_rate: float
    mpesa_status: str        # completed | pending | failed
    message: str
    provider: str            # intasend | demo


# ---------------------------------------------------------------------------
# Helper: resolve an identifier to a DB row + Stellar public key
# (must be defined before any routes that use it)
# ---------------------------------------------------------------------------

def _resolve_account(identifier: str) -> tuple[str, dict | None]:
    """Resolve a worker ID (NW-…) or Stellar public key (G…) to (public_key, db_row | None).

    The returned ``db_row`` always includes ``stellar_secret_encrypted``
    (fetched via ``get_worker_by_public_key``) so callers can decrypt and
    sign transactions.

    Returns:
        (stellar_public_key, db_row_or_None)
    Raises:
        HTTPException 404 if the worker ID is not found.
        HTTPException 400 if the identifier is neither a valid worker ID nor a Stellar key.
    """
    identifier = identifier.strip()

    # Worker-ID format (e.g. NW-63A758A8)
    if identifier.upper().startswith("NW-"):
        row = get_by_worker_id(identifier.upper())
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Worker ID '{identifier}' not found.",
            )
        pk = row["stellar_public_key"]
        # Re-fetch via public key so the row includes stellar_secret_encrypted
        full_row = get_worker_by_public_key(pk)
        return pk, full_row

    # Otherwise treat as a Stellar public key
    try:
        pk = validate_stellar_public_key(identifier)
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=e.to_dict())

    row = get_worker_by_public_key(pk)
    return pk, row


# ---------------------------------------------------------------------------
# Static POST routes (must come BEFORE /{public_key} dynamic GET routes)
# ---------------------------------------------------------------------------

@router.post("/send", response_model=SendPaymentResponse)
async def send_payment(
    request: SendPaymentRequest,
    payment_service: PaymentService = Depends(get_payment_service),
):
    """
    Send KSH from one registered account to another.

    Both `sender` and `destination` accept **either** a Stellar public key
    (G…) **or** a system worker ID (NW-XXXX).  The backend resolves
    worker IDs to public keys automatically.
    """
    # Resolve sender
    sender_pk, sender_row = _resolve_account(request.sender)
    if sender_row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sender account not found in the system.",
        )

    # Resolve destination
    dest_pk, dest_row = _resolve_account(request.destination)

    # Decrypt the sender's secret and build a Keypair
    try:
        secret = decrypt_secret(sender_row["stellar_secret_encrypted"])
        sender_keypair = Keypair.from_secret(secret)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to decrypt sender credentials: {e}",
        )

    # Sign & submit
    try:
        result = payment_service.send_payment(
            sender_keypair=sender_keypair,
            destination_public_key=dest_pk,
            amount=request.amount,
            memo=request.memo,
        )
        tx_hash = result.get("hash", "")
        return SendPaymentResponse(
            successful=result.get("successful", False),
            tx_hash=tx_hash,
            explorer_url=build_stellar_explorer_url(tx_hash),
            amount=request.amount,
            from_account=sender_pk,
            to_account=dest_pk,
            from_worker_id=sender_row.get("worker_id") if sender_row else None,
            to_worker_id=dest_row.get("worker_id") if dest_row else None,
        )
    except StellarError as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=e.to_dict())
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/deposit/create", response_model=DepositCreateResponse)
async def create_deposit(request: DepositCreateRequest):
    """Return platform public key + unique memo for the user to send funds to."""
    if not settings.stellar_platform_public:
        raise HTTPException(status_code=500, detail="Platform not configured")

    memo = f"dep-{uuid4().hex[:8]}"
    expires = datetime.utcnow() + timedelta(hours=1)
    return DepositCreateResponse(
        platform_public=settings.stellar_platform_public,
        memo=memo,
        amount=request.amount,
        expires_at=expires,
    )


@router.post("/deposit/verify")
async def verify_deposit(request: DepositVerifyRequest, payment_service: PaymentService = Depends(get_payment_service)):
    """Check if a deposit with the given memo has arrived."""
    if not settings.stellar_platform_public:
        raise HTTPException(status_code=500, detail="Platform not configured")
    try:
        payments = payment_service.get_payment_history(
            public_key=settings.stellar_platform_public,
            limit=50,
        )
        for p in payments:
            if p.get("memo") == request.memo:
                return {
                    "verified": True,
                    "amount": p.get("amount"),
                    "from": p.get("from"),
                    "transaction_hash": p.get("transaction_hash"),
                }
        return {"verified": False}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/withdraw")
async def withdraw(request: WithdrawRequest, current_user=Depends(get_current_user), payment_service: PaymentService = Depends(get_payment_service)):
    """Withdraw funds from platform to a destination account."""
    try:
        dest = validate_stellar_public_key(request.destination)
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=e.to_dict())

    if settings.stellar_platform_secret:
        try:
            kp = Keypair.from_secret(settings.stellar_platform_secret)
            result = payment_service.send_payment(
                sender_keypair=kp,
                destination_public_key=dest,
                amount=request.amount,
            )
            return {"submitted": True, "result": result}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    try:
        tx = payment_service.build_payment_transaction(
            source_public_key=settings.stellar_platform_public,
            destination_public_key=dest,
            amount=request.amount,
        )
        xdr = tx.to_xdr()
        return {"unsigned_xdr": xdr}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/offramp", response_model=OfframpResponse)
async def offramp_to_mpesa(
    request: OfframpRequest,
    payment_service: PaymentService = Depends(get_payment_service),
):
    """
    Off-ramp: convert KSH on Stellar to KES on M-Pesa.

    Flow:
      1. Burn KSH by sending from the worker's Stellar wallet to the
         platform's Stellar account.
      2. Trigger an M-Pesa B2C payout to the worker's phone number via
         IntaSend (or demo simulation when no credentials are configured).
    """
    from app.integrations.mpesa import mpesa_b2c_payout

    sender_pk, sender_row = _resolve_account(request.sender)
    if sender_row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sender account not found in the system.",
        )

    platform_public = settings.stellar_platform_public
    if not platform_public:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Platform Stellar account not configured.",
        )

    stellar_tx_hash = None
    stellar_explorer_url = None
    try:
        secret = decrypt_secret(sender_row["stellar_secret_encrypted"])
        sender_keypair = Keypair.from_secret(secret)

        result = payment_service.send_payment(
            sender_keypair=sender_keypair,
            destination_public_key=platform_public,
            amount=request.amount,
            memo="M-Pesa off-ramp",
        )
        stellar_tx_hash = result.get("hash", "")
        stellar_explorer_url = build_stellar_explorer_url(stellar_tx_hash)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Stellar burn transaction failed: {e}",
        )

    try:
        mpesa_result = mpesa_b2c_payout(
            phone=request.phone,
            amount_ksh=float(request.amount),
        )
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Stellar transfer succeeded (tx: {stellar_tx_hash}) but M-Pesa payout failed: {e}. Contact support.",
        )

    return OfframpResponse(
        success=mpesa_result.success,
        stellar_tx_hash=stellar_tx_hash,
        stellar_explorer_url=stellar_explorer_url,
        mpesa_transaction_id=mpesa_result.transaction_id,
        phone=mpesa_result.phone,
        amount_ksh=mpesa_result.amount_ksh,
        amount_kes=mpesa_result.amount_kes,
        exchange_rate=mpesa_result.exchange_rate,
        mpesa_status=mpesa_result.status,
        message=mpesa_result.message,
        provider=mpesa_result.provider,
    )


# ---------------------------------------------------------------------------
# Dynamic GET routes (/{public_key} catch-all – MUST be last)
# ---------------------------------------------------------------------------

@router.get("/{public_key}", response_model=PaymentHistoryResponse)
async def get_payment_history(
    public_key: str,
    limit: int = Query(20, ge=1, le=100),
    cursor: Optional[str] = Query(None),
    payment_service: PaymentService = Depends(get_payment_service),
):
    """
    Get payment history for an account.
    
    Queries the Stellar Horizon API for all payments.
    Returns empty list if the account is not funded on the network yet.
    """
    try:
        public_key = validate_stellar_public_key(public_key)
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.to_dict()
        )

    try:
        payments = payment_service.get_payment_history(
            public_key=public_key,
            limit=limit,
            cursor=cursor
        )
    except Exception:
        # Account not on network yet – return empty history
        return PaymentHistoryResponse(payments=[], total_count=0, cursor=None)

    # Collect unique public keys to resolve worker IDs in one pass
    all_pks = set()
    for p in payments:
        all_pks.add(p.get("from", ""))
        all_pks.add(p.get("to", ""))
    all_pks.discard("")

    pk_to_worker_id: Dict[str, str] = {}
    for pk in all_pks:
        row = get_worker_by_public_key(pk)
        if row:
            pk_to_worker_id[pk] = row["worker_id"]

    records = []
    for p in payments:
        from_pk = p.get("from", "")
        to_pk = p.get("to", "")
        records.append(PaymentRecord(
            id=p.get("id", ""),
            from_account=from_pk,
            to_account=to_pk,
            from_worker_id=pk_to_worker_id.get(from_pk),
            to_worker_id=pk_to_worker_id.get(to_pk),
            amount=p.get("amount", "0"),
            asset_type=p.get("asset_type", "native"),
            asset_code=p.get("asset_code"),
            created_at=p.get("created_at", ""),
            transaction_hash=p.get("transaction_hash", ""),
            explorer_url=build_stellar_explorer_url(tx_hash=p.get("transaction_hash"))
        ))

    next_cursor = payments[-1].get("paging_token") if payments else None

    return PaymentHistoryResponse(
        payments=records,
        total_count=len(records),
        cursor=next_cursor
    )


@router.get("/{public_key}/stats", response_model=PaymentStatsResponse)
async def get_payment_stats(
    public_key: str,
    payment_service: PaymentService = Depends(get_payment_service),
):
    """
    Get payment statistics for an account.
    Returns zeros if the account is not funded on the network yet.
    """
    try:
        public_key = validate_stellar_public_key(public_key)
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.to_dict()
        )

    try:
        stats = payment_service.get_payment_stats(public_key)
        return PaymentStatsResponse(**stats)
    except Exception:
        # Account not on network yet – return zero stats
        return PaymentStatsResponse(
            total_received=0.0,
            total_sent=0.0,
            received_count=0,
            sent_count=0,
            unique_senders=0,
            unique_recipients=0,
        )


@router.get("/{public_key}/incoming")
async def get_incoming_payments(
    public_key: str,
    limit: int = Query(20, ge=1, le=100),
    payment_service: PaymentService = Depends(get_payment_service),
):
    """Get only incoming payments for an account."""
    try:
        public_key = validate_stellar_public_key(public_key)
        payments = payment_service.get_incoming_payments(public_key, limit)
        
        return {
            "payments": payments,
            "count": len(payments)
        }
        
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.to_dict()
        )

