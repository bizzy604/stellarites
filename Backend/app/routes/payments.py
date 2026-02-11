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
from pydantic import BaseModel
from app.config import get_settings
from stellar_sdk import Keypair
from datetime import datetime, timedelta
from uuid import uuid4

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


# Response Models
class PaymentRecord(BaseModel):
    """Single payment record."""
    id: str
    from_account: str
    to_account: str
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
    
    Args:
        public_key: Stellar account to query
        limit: Maximum payments to return (1-100)
        cursor: Pagination cursor
        
    Returns:
        List of payment records
    """
    try:
        # Validate public key
        public_key = validate_stellar_public_key(public_key)
        
        # Get payments from Horizon
        payments = payment_service.get_payment_history(
            public_key=public_key,
            limit=limit,
            cursor=cursor
        )
        
        # Transform to response format
        records = []
        for p in payments:
            records.append(PaymentRecord(
                id=p.get("id", ""),
                from_account=p.get("from", ""),
                to_account=p.get("to", ""),
                amount=p.get("amount", "0"),
                asset_type=p.get("asset_type", "native"),
                asset_code=p.get("asset_code"),
                created_at=p.get("created_at", ""),
                transaction_hash=p.get("transaction_hash", ""),
                explorer_url=build_stellar_explorer_url(tx_hash=p.get("transaction_hash"))
            ))
        
        # Get cursor for next page
        next_cursor = payments[-1].get("paging_token") if payments else None
        
        return PaymentHistoryResponse(
            payments=records,
            total_count=len(records),
            cursor=next_cursor
        )
        
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.to_dict()
        )
    except StellarError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=e.to_dict()
        )


@router.get("/{public_key}/stats", response_model=PaymentStatsResponse)
async def get_payment_stats(
    public_key: str,
    payment_service: PaymentService = Depends(get_payment_service),
):
    """
    Get payment statistics for an account.
    
    Calculates totals and counts from payment history.
    
    Args:
        public_key: Stellar account to query
        
    Returns:
        Payment statistics
    """
    try:
        # Validate public key
        public_key = validate_stellar_public_key(public_key)
        
        # Get stats
        stats = payment_service.get_payment_stats(public_key)
        
        return PaymentStatsResponse(**stats)
        
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.to_dict()
        )
    except StellarError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=e.to_dict()
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


# --- New endpoints: deposit / withdraw ---


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
