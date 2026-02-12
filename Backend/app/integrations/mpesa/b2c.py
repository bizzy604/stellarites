"""
M-Pesa B2C (Business-to-Customer) Payout via IntaSend.

IntaSend wraps the Safaricom Daraja API and provides a simpler REST
interface for M-Pesa payouts in Kenya.  When INTASEND_API_KEY is not
configured (demo / testnet mode), we simulate the payout so the full
off-ramp flow can be demonstrated without real credentials.

Production setup:
  1. Sign up at https://intasend.com and get API keys.
  2. Set INTASEND_API_KEY and INTASEND_SECRET in .env.
  3. Fund your IntaSend wallet or enable auto-settlement.
"""

import os
import uuid
import time
from dataclasses import dataclass
from typing import Optional

import requests as http_requests

INTASEND_API_KEY = os.getenv("INTASEND_API_KEY", "")
INTASEND_SECRET = os.getenv("INTASEND_SECRET", "")
INTASEND_BASE = os.getenv("INTASEND_BASE_URL", "https://sandbox.intasend.com")

# Simulated exchange rate: 1 KSH (Stellar native) ≈ 1 KES  (for demo)
EXCHANGE_RATE = float(os.getenv("KSH_TO_KES_RATE", "1.0"))


@dataclass
class MpesaPayoutResult:
    success: bool
    transaction_id: str
    phone: str
    amount_ksh: str          # amount burned on Stellar
    amount_kes: str          # amount sent to M-Pesa
    exchange_rate: float
    status: str              # "completed" | "pending" | "failed"
    message: str
    provider: str            # "intasend" | "demo"


def _normalize_phone(phone: str) -> str:
    """Normalize Kenyan phone number to 254XXXXXXXXX format."""
    phone = phone.strip().replace(" ", "").replace("-", "")
    if phone.startswith("+"):
        phone = phone[1:]
    if phone.startswith("0"):
        phone = "254" + phone[1:]
    if not phone.startswith("254"):
        phone = "254" + phone
    return phone


def _demo_payout(phone: str, amount_ksh: float) -> MpesaPayoutResult:
    """Simulate an M-Pesa payout for demo / testnet usage."""
    amount_kes = round(amount_ksh * EXCHANGE_RATE, 2)
    tx_id = f"MPESA-DEMO-{uuid.uuid4().hex[:10].upper()}"
    return MpesaPayoutResult(
        success=True,
        transaction_id=tx_id,
        phone=phone,
        amount_ksh=str(amount_ksh),
        amount_kes=str(amount_kes),
        exchange_rate=EXCHANGE_RATE,
        status="completed",
        message=f"Demo payout of KES {amount_kes:,.2f} sent to {phone}",
        provider="demo",
    )


def _intasend_payout(phone: str, amount_ksh: float) -> MpesaPayoutResult:
    """
    Send real M-Pesa B2C payout via IntaSend API.

    Docs: https://developers.intasend.com/docs/m-pesa-b2c
    """
    amount_kes = round(amount_ksh * EXCHANGE_RATE, 2)

    headers = {
        "Authorization": f"Bearer {INTASEND_SECRET}",
        "Content-Type": "application/json",
    }

    payload = {
        "currency": "KES",
        "transactions": [
            {
                "name": "Paytrace Withdrawal",
                "account": phone,
                "amount": amount_kes,
                "narrative": "Paytrace off-ramp withdrawal",
            }
        ],
    }

    try:
        resp = http_requests.post(
            f"{INTASEND_BASE}/api/v1/send-money/mpesa/",
            json=payload,
            headers=headers,
            timeout=30,
        )

        data = resp.json() if resp.ok else {}

        if resp.ok:
            tracking_id = data.get("tracking_id", data.get("file_id", str(uuid.uuid4())))
            return MpesaPayoutResult(
                success=True,
                transaction_id=f"MPESA-{tracking_id}",
                phone=phone,
                amount_ksh=str(amount_ksh),
                amount_kes=str(amount_kes),
                exchange_rate=EXCHANGE_RATE,
                status="pending",
                message=f"KES {amount_kes:,.2f} payout initiated to {phone}. You will receive it shortly.",
                provider="intasend",
            )
        else:
            detail = data.get("errors", data.get("detail", resp.text[:200]))
            return MpesaPayoutResult(
                success=False,
                transaction_id="",
                phone=phone,
                amount_ksh=str(amount_ksh),
                amount_kes=str(amount_kes),
                exchange_rate=EXCHANGE_RATE,
                status="failed",
                message=f"M-Pesa payout failed: {detail}",
                provider="intasend",
            )

    except Exception as e:
        return MpesaPayoutResult(
            success=False,
            transaction_id="",
            phone=phone,
            amount_ksh=str(amount_ksh),
            amount_kes=str(amount_kes),
            exchange_rate=EXCHANGE_RATE,
            status="failed",
            message=f"M-Pesa request error: {e}",
            provider="intasend",
        )


def mpesa_b2c_payout(phone: str, amount_ksh: float) -> MpesaPayoutResult:
    """
    Off-ramp: send KES to an M-Pesa phone number.

    Uses IntaSend when credentials are configured, otherwise falls back
    to a demo simulation.
    """
    phone = _normalize_phone(phone)

    if INTASEND_API_KEY and INTASEND_SECRET:
        return _intasend_payout(phone, amount_ksh)
    else:
        return _demo_payout(phone, amount_ksh)
