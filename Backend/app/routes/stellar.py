"""
Stellar Routes

Stellar blockchain related endpoints.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.services.stellar import StellarService

router = APIRouter(prefix="/stellar", tags=["Stellar"])


class PlatformKeyResponse(BaseModel):
    platform_public_key: Optional[str]


@router.get("/platform-key", response_model=PlatformKeyResponse)
def get_platform_public_key():
    """
    Get the platform's Stellar public key.
    """
    try:
        service = StellarService()
        public_key = service.platform_public_key
        return PlatformKeyResponse(platform_public_key=public_key)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))