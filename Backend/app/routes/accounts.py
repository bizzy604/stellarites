"""
Account Routes

Account creation, login, profile and balance endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List
import requests as http_requests

from app.services.user_service import create_account
from app.services.account import AccountService
from app.db.repositories import get_worker_by_phone, get_worker_by_public_key, get_by_worker_id
from app.config import Config

router = APIRouter(prefix="/accounts", tags=["Accounts"])


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class CreateAccountRequest(BaseModel):
    phone: str
    name: Optional[str] = None
    role: str = "worker"          # "worker" | "employer"
    send_sms: bool = True


class CreateAccountResponse(BaseModel):
    worker_id: str
    stellar_public_key: str
    phone: str
    name: str
    role: str
    already_exists: bool


class LoginRequest(BaseModel):
    phone: str


class LoginResponse(BaseModel):
    worker_id: str
    stellar_public_key: str
    phone: str
    name: str
    role: str


class WorkerProfileResponse(BaseModel):
    public_key: str
    worker_type: Optional[str] = None
    skills: list[str] = []
    experience: Optional[str] = None
    ipfs_profile_hash: Optional[str] = None
    name: Optional[str] = None
    phone_hash: Optional[str] = None
    role: Optional[str] = None


class BalanceItem(BaseModel):
    asset_type: str
    asset_code: Optional[str] = None
    balance: str


class BalanceResponse(BaseModel):
    public_key: str
    balances: List[BalanceItem]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/create", response_model=CreateAccountResponse)
def create_user_account(request: CreateAccountRequest):
    """
    Create a new account with a Stellar wallet.

    If the phone already exists the existing account is returned with
    ``already_exists = true``.
    """
    try:
        result = create_account(
            phone=request.phone,
            name=request.name,
            role=request.role,
            send_sms=request.send_sms,
        )
        return CreateAccountResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest):
    """
    Look up an existing account by phone number.

    Returns the Stellar public key and account metadata so the frontend
    can store them locally.  No JWT is issued – the public key itself is
    the user's identity for subsequent API calls.
    """
    worker = get_worker_by_phone(request.phone)
    if not worker:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found for this phone number.",
        )
    return LoginResponse(
        worker_id=worker["worker_id"],
        stellar_public_key=worker["stellar_public_key"],
        phone=worker["phone"],
        name=worker.get("name", ""),
        role=worker.get("role", "worker"),
    )


class ResolveResponse(BaseModel):
    """Resolved account info from a worker ID or public key."""
    worker_id: str
    stellar_public_key: str
    name: str
    role: str


@router.get("/resolve/{identifier}", response_model=ResolveResponse)
def resolve_account(identifier: str):
    """
    Resolve a worker ID (NW-XXXX), Stellar public key (G…), or phone number
    to full account details.  Useful for the frontend to display names /
    validate recipients before sending payments.
    """
    identifier = identifier.strip()
    row = None

    if identifier.upper().startswith("NW-"):
        row = get_by_worker_id(identifier.upper())
    elif identifier.startswith("G"):
        row = get_worker_by_public_key(identifier)
    else:
        # Try phone number lookup as fallback
        row = get_worker_by_phone(identifier)

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Account '{identifier}' not found.",
        )

    return ResolveResponse(
        worker_id=row["worker_id"],
        stellar_public_key=row["stellar_public_key"],
        name=row.get("name", ""),
        role=row.get("role", "worker"),
    )


@router.get("/profile/{public_key}", response_model=WorkerProfileResponse)
def get_worker_profile(public_key: str):
    """
    Get profile data from Stellar account metadata + local DB.
    Falls back to DB-only data if the Stellar account is not funded yet.
    """
    profile: dict = {
        "public_key": public_key,
        "worker_type": None,
        "skills": [],
        "experience": None,
        "ipfs_profile_hash": None,
        "name": None,
        "phone_hash": None,
        "role": None,
    }

    # Try Stellar on-chain data (may fail if account not funded)
    try:
        service = AccountService()
        profile = service.get_worker_profile(public_key)
    except Exception:
        pass  # Account not on network yet; use DB data below

    # Enrich / fallback with DB data
    db_row = get_worker_by_public_key(public_key)
    if db_row:
        profile["role"] = db_row.get("role", "worker")
        if not profile.get("name"):
            profile["name"] = db_row.get("name")

    return WorkerProfileResponse(**profile)


@router.get("/{public_key}/balance", response_model=BalanceResponse)
def get_account_balance(public_key: str):
    """
    Fetch live KSH (and other asset) balances from the Stellar network.
    Returns zero balance if the account is not funded yet.
    """
    try:
        service = AccountService()
        info = service.get_account_info(public_key)
        balances = [
            BalanceItem(
                asset_type=b.get("asset_type", "native"),
                asset_code=b.get("asset_code"),
                balance=b.get("balance", "0"),
            )
            for b in info.get("balances", [])
        ]
        return BalanceResponse(public_key=public_key, balances=balances)
    except Exception:
        # Account not funded on the network yet – return zero balance
        return BalanceResponse(
            public_key=public_key,
            balances=[BalanceItem(asset_type="native", balance="0")],
        )


# ---------------------------------------------------------------------------
# Testnet funding (Friendbot)
# ---------------------------------------------------------------------------

class FundResponse(BaseModel):
    funded: bool
    message: str


@router.post("/{public_key}/fund", response_model=FundResponse)
def fund_account(public_key: str):
    """
    Fund a Stellar **testnet** account via Friendbot (adds 10 000 KSH).

    Only works when STELLAR_NETWORK=TESTNET.
    """
    if Config.STELLAR_NETWORK != "TESTNET":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Friendbot funding is only available on testnet.",
        )

    try:
        resp = http_requests.get(
            "https://friendbot.stellar.org",
            params={"addr": public_key},
            timeout=30,
        )

        if resp.status_code == 200:
            return FundResponse(funded=True, message="Account funded with 10,000 KSH from Friendbot.")

        # Friendbot returns 400 if already funded
        body = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
        detail = body.get("detail", resp.text[:200])

        if "already" in str(detail).lower():
            return FundResponse(funded=True, message="Account was already funded on testnet.")

        raise HTTPException(status_code=resp.status_code, detail=detail)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Friendbot request failed: {e}",
        )