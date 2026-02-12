"""
M-Pesa STK Push (collect payment) for on-ramp.

When user pays via M-Pesa, we collect KES and credit their Stellar account
with KSH.  In demo mode (no IntaSend credentials), we simulate success.

Production: Use IntaSend STK Push API to trigger M-Pesa prompt on user's phone.
"""

import os
import uuid
from dataclasses import dataclass
from .b2c import _normalize_phone, EXCHANGE_RATE

INTASEND_API_KEY = os.getenv("INTASEND_API_KEY", "")
INTASEND_SECRET = os.getenv("INTASEND_SECRET", "")
INTASEND_BASE = os.getenv("INTASEND_BASE_URL", "https://sandbox.intasend.com")


@dataclass
class MpesaCollectResult:
    success: bool
    transaction_id: str
    phone: str
    amount_kes: float
    amount_ksh: float
    status: str       # "completed" | "pending" | "failed"
    message: str
    provider: str    # "intasend" | "demo"


def _demo_collect(phone: str, amount_kes: float) -> MpesaCollectResult:
    """Simulate M-Pesa collection for demo."""
    amount_ksh = round(amount_kes / EXCHANGE_RATE, 2)
    tx_id = f"MPESA-COLLECT-{uuid.uuid4().hex[:10].upper()}"
    return MpesaCollectResult(
        success=True,
        transaction_id=tx_id,
        phone=phone,
        amount_kes=amount_kes,
        amount_ksh=amount_ksh,
        status="completed",
        message=f"Demo: KES {amount_kes:,.2f} collected. Account will be credited with {amount_ksh:,.2f} KSH.",
        provider="demo",
    )


def _intasend_stk_push(phone: str, amount_kes: float, narrative: str = "Paytrace fund") -> MpesaCollectResult:
    """
    Initiate real M-Pesa STK Push via IntaSend.

    User receives prompt on phone to enter M-Pesa PIN.
    Payment is async; we return pending. Webhook confirms completion.
    """
    import requests as http_requests

    phone = _normalize_phone(phone)

    headers = {
        "Authorization": f"Bearer {INTASEND_SECRET}",
        "Content-Type": "application/json",
    }

    payload = {
        "amount": amount_kes,
        "phone_number": phone,
        "email": "user@paytrace.demo",
        "narrative": narrative,
    }

    try:
        resp = http_requests.post(
            f"{INTASEND_BASE}/api/v1/payment/collect/mpesa/",
            json=payload,
            headers=headers,
            timeout=30,
        )

        data = resp.json() if resp.ok else {}

        if resp.ok:
            inv_id = data.get("invoice", {}).get("invoice_id", data.get("invoice_id", str(uuid.uuid4())))
            return MpesaCollectResult(
                success=True,
                transaction_id=f"MPESA-{inv_id}",
                phone=phone,
                amount_kes=amount_kes,
                amount_ksh=round(amount_kes / EXCHANGE_RATE, 2),
                status="pending",
                message="M-Pesa prompt sent to your phone. Enter PIN to complete.",
                provider="intasend",
            )
        else:
            detail = data.get("errors", data.get("detail", resp.text[:200]))
            return MpesaCollectResult(
                success=False,
                transaction_id="",
                phone=phone,
                amount_kes=amount_kes,
                amount_ksh=0,
                status="failed",
                message=f"M-Pesa collection failed: {detail}",
                provider="intasend",
            )

    except Exception as e:
        return MpesaCollectResult(
            success=False,
            transaction_id="",
            phone=phone,
            amount_kes=amount_kes,
            amount_ksh=0,
            status="failed",
            message=f"M-Pesa request error: {e}",
            provider="intasend",
        )


def mpesa_collect(phone: str, amount_kes: float, narrative: str = "Paytrace fund") -> MpesaCollectResult:
    """
    On-ramp: collect KES via M-Pesa and return result.

    In demo mode, simulates successful collection.
    With IntaSend credentials, triggers real STK Push.
    """
    phone = _normalize_phone(phone)

    if INTASEND_API_KEY and INTASEND_SECRET:
        return _intasend_stk_push(phone, amount_kes, narrative)
    else:
        return _demo_collect(phone, amount_kes)
