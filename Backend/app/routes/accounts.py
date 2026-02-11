"""
Account Routes

Account creation and management endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional

from app.services.user_service import create_account
from app.services.account import AccountService
from app.middlewares.auth_middleware import get_current_user

router = APIRouter(prefix="/accounts", tags=["Accounts"])


class CreateAccountRequest(BaseModel):
    phone: str
    name: Optional[str] = None
    send_sms: bool = True


class CreateAccountResponse(BaseModel):
    worker_id: str
    stellar_public_key: str
    phone: str
    already_exists: bool


class WorkerProfileResponse(BaseModel):
    public_key: str
    worker_type: Optional[str]
    skills: list[str]
    experience: Optional[str]
    ipfs_profile_hash: Optional[str]
    name: Optional[str]
    phone_hash: Optional[str]


@router.post("/create", response_model=CreateAccountResponse)
def create_user_account(request: CreateAccountRequest):
    """
    Create a new worker account with Stellar wallet.
    """
    try:
        result = create_account(
            phone=request.phone,
            name=request.name,
            send_sms=request.send_sms
        )
        return CreateAccountResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/profile/{public_key}", response_model=WorkerProfileResponse)
def get_worker_profile(public_key: str, current_user: dict = Depends(get_current_user)):
    """
    Get worker profile data from Stellar account.
    """
    try:
        service = AccountService()
        profile = service.get_worker_profile(public_key)
        return WorkerProfileResponse(**profile)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))