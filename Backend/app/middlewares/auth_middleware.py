from typing import Optional
from fastapi import Depends, HTTPException, status


async def get_current_user(token: Optional[str] = None):
    """Minimal auth dependency stub.

    This returns None (no-op) so routes can load and Swagger shows endpoints.
    Replace with real SEP-10 or JWT auth later.
    """
    return None
