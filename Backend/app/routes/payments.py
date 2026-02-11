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


# --- Helper: resolve an identifier to a DB row + Stellar public key ---

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


# --- Send payment (user-to-user) ---

@router.post("/send", response_model=SendPaymentResponse)
async def send_payment(
    request: SendPaymentRequest,
    payment_service: PaymentService = Depends(get_payment_service),
):
    """
    Send XLM from one registered account to another.

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


# --- Deposit / withdraw ---


@router.post("/deposit/create", response_model=DepositCreateResponse)
async def create_deposit(request: DepositCreateRequest):
    """Create a deposit invoice for the client to pay using Freighter.

    The client should create a payment from their Freighter wallet to
    `platform_public` and include the returned `memo`.
    """
    memo = f"deposit:{uuid4().hex}"
    expires_at = datetime.utcnow() + timedelta(minutes=30)
    return DepositCreateResponse(
        platform_public=settings.stellar_platform_public or "",
        memo=memo,
        amount=request.amount,
        expires_at=expires_at,
    )


@router.post("/deposit/verify")
async def verify_deposit(request: DepositVerifyRequest, payment_service: PaymentService = Depends(get_payment_service)):
    """Verify a deposit using the memo. Scans recent payments to platform.

    This is a best-effort verification: it searches incoming payments to the
    platform account and looks up the transaction memo for a match.
    """
    # fetch recent payments to platform
    try:
        payments = payment_service.get_incoming_payments(settings.stellar_platform_public, limit=200)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    stellar = payment_service.stellar
    for p in payments:
        tx_hash = p.get("transaction_hash")
        if not tx_hash:
            continue
        try:
            tx = stellar.server.transactions().transaction(tx_hash).call()
            memo = tx.get("memo")
            if memo == request.memo:
                return {"found": True, "payment": p}
        except Exception:
            continue

    raise HTTPException(status_code=404, detail="Deposit not found")


@router.post("/withdraw")
async def withdraw(request: WithdrawRequest, current_user=Depends(get_current_user), payment_service: PaymentService = Depends(get_payment_service)):
    """Withdraw funds from platform to a destination account.

    If the server has `stellar_platform_secret` configured it will sign
    and submit the transaction automatically. Otherwise the unsigned
    transaction XDR will be returned for external signing (e.g., via
    Freighter).
    """
    # validate destination
    try:
        dest = validate_stellar_public_key(request.destination)
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=e.to_dict())

    # If platform secret is available, sign and send server-side
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

    # Otherwise build unsigned transaction and return XDR
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
