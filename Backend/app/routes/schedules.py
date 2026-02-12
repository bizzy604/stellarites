"""
Schedules & Claims Routes

Endpoints for scheduled recurring payments and worker payment claims.
"""
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from typing import Optional, List
import traceback
import logging

from app.db.repositories import schedule_repository, claim_repository
from app.services.payments import get_payment_service, PaymentService
from app.db.repositories import get_by_worker_id, get_worker_by_public_key
from app.integrations.stellar import decrypt_secret
from app.utils.stellar_helpers import build_stellar_explorer_url
from stellar_sdk import Keypair

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Schedules & Claims"])

# ── Pydantic models ──────────────────────────────────────────────────────────

class CreateScheduleRequest(BaseModel):
    employer_id: str          # NW-XXXX
    worker_id: str            # NW-XXXX
    amount: str
    frequency: str = "monthly"  # monthly | biweekly | weekly
    next_payment_date: str = ""  # YYYY-MM-DD; defaults to today
    memo: str = ""


class ScheduleResponse(BaseModel):
    id: int
    schedule_id: str
    employer_id: str
    worker_id: str
    amount: str
    frequency: str
    next_payment_date: str
    status: str
    memo: str
    created_at: str


class UpdateScheduleRequest(BaseModel):
    status: str  # active | paused | cancelled


class CreateClaimRequest(BaseModel):
    schedule_id: Optional[str] = None
    worker_id: str            # NW-XXXX
    employer_id: str          # NW-XXXX
    amount: str
    message: str = ""


class ClaimResponse(BaseModel):
    id: int
    claim_id: str
    schedule_id: Optional[str] = None
    worker_id: str
    employer_id: str
    amount: str
    message: str
    status: str
    created_at: str


class UpdateClaimRequest(BaseModel):
    status: str  # approved | rejected


class ExecuteDueResponse(BaseModel):
    executed: int
    failed: int
    details: List[dict]


# ── Schedule endpoints ────────────────────────────────────────────────────────

@router.post("/schedules", response_model=ScheduleResponse, status_code=201)
def create_schedule(req: CreateScheduleRequest):
    """Employer creates a recurring payment schedule for a worker."""
    # Validate both IDs exist
    if not get_by_worker_id(req.employer_id):
        raise HTTPException(status_code=404, detail=f"Employer '{req.employer_id}' not found.")
    if not get_by_worker_id(req.worker_id):
        raise HTTPException(status_code=404, detail=f"Worker '{req.worker_id}' not found.")
    if req.frequency not in ("weekly", "biweekly", "monthly"):
        raise HTTPException(status_code=400, detail="frequency must be weekly, biweekly, or monthly.")

    row = schedule_repository.create(
        employer_id=req.employer_id,
        worker_id=req.worker_id,
        amount=req.amount,
        frequency=req.frequency,
        next_payment_date=req.next_payment_date,
        memo=req.memo,
    )
    return ScheduleResponse(**row)


@router.get("/schedules/employer/{employer_id}", response_model=List[ScheduleResponse])
def list_employer_schedules(employer_id: str):
    """List all schedules an employer has created."""
    rows = schedule_repository.get_by_employer(employer_id.upper())
    return [ScheduleResponse(**r) for r in rows]


@router.get("/schedules/worker/{worker_id}", response_model=List[ScheduleResponse])
def list_worker_schedules(worker_id: str):
    """List active schedules targeting a worker (upcoming payments)."""
    rows = schedule_repository.get_for_worker(worker_id.upper())
    return [ScheduleResponse(**r) for r in rows]


@router.patch("/schedules/{schedule_id}", response_model=ScheduleResponse)
def update_schedule(schedule_id: str, req: UpdateScheduleRequest):
    """Pause or cancel a schedule."""
    if req.status not in ("active", "paused", "cancelled"):
        raise HTTPException(status_code=400, detail="status must be active, paused, or cancelled.")
    row = schedule_repository.update_status(schedule_id.upper(), req.status)
    if not row:
        raise HTTPException(status_code=404, detail=f"Schedule '{schedule_id}' not found.")
    return ScheduleResponse(**row)


@router.post("/schedules/execute-due", response_model=ExecuteDueResponse)
def execute_due_payments(
    payment_service: PaymentService = Depends(get_payment_service),
):
    """Find all due schedules and execute payments. Advances next dates."""
    return _run_due_payments(payment_service)


def _run_due_payments(payment_service: PaymentService) -> dict:
    """Shared logic for executing due payments (used by route + background task)."""
    due = schedule_repository.get_due()
    executed = 0
    failed = 0
    details: list[dict] = []

    for sched in due:
        employer_id = sched["employer_id"]
        worker_id = sched["worker_id"]
        amount = sched["amount"]
        schedule_id = sched["schedule_id"]

        try:
            # Resolve employer → Stellar key + secret
            emp_row = get_by_worker_id(employer_id)
            if not emp_row:
                raise ValueError(f"Employer {employer_id} not found")
            emp_pk = emp_row["stellar_public_key"]
            emp_full = get_worker_by_public_key(emp_pk)
            if not emp_full:
                raise ValueError(f"Employer Stellar record not found for {emp_pk}")
            secret = decrypt_secret(emp_full["stellar_secret_encrypted"])
            sender_kp = Keypair.from_secret(secret)

            # Resolve worker → Stellar key
            wrk_row = get_by_worker_id(worker_id)
            if not wrk_row:
                raise ValueError(f"Worker {worker_id} not found")
            dest_pk = wrk_row["stellar_public_key"]

            result = payment_service.send_payment(
                sender_keypair=sender_kp,
                destination_public_key=dest_pk,
                amount=amount,
                memo=f"Scheduled {schedule_id}",
            )
            tx_hash = result.get("hash", "")
            schedule_repository.advance_next_date(schedule_id)
            executed += 1
            details.append({
                "schedule_id": schedule_id,
                "status": "ok",
                "tx_hash": tx_hash,
                "explorer_url": build_stellar_explorer_url(tx_hash),
            })
        except Exception as e:
            traceback.print_exc()
            failed += 1
            details.append({
                "schedule_id": schedule_id,
                "status": "error",
                "error": str(e),
            })

    return {"executed": executed, "failed": failed, "details": details}


# ── Claim endpoints ───────────────────────────────────────────────────────────

@router.post("/claims", response_model=ClaimResponse, status_code=201)
def create_claim(req: CreateClaimRequest):
    """Worker claims (requests) a payment from an employer."""
    if not get_by_worker_id(req.worker_id):
        raise HTTPException(status_code=404, detail=f"Worker '{req.worker_id}' not found.")
    if not get_by_worker_id(req.employer_id):
        raise HTTPException(status_code=404, detail=f"Employer '{req.employer_id}' not found.")
    row = claim_repository.create(
        worker_id=req.worker_id,
        employer_id=req.employer_id,
        amount=req.amount,
        message=req.message,
        schedule_id=req.schedule_id,
    )
    return ClaimResponse(**row)


@router.get("/claims/employer/{employer_id}", response_model=List[ClaimResponse])
def list_employer_claims(employer_id: str):
    """Employer views all claims addressed to them."""
    rows = claim_repository.get_by_employer(employer_id.upper())
    return [ClaimResponse(**r) for r in rows]


@router.get("/claims/worker/{worker_id}", response_model=List[ClaimResponse])
def list_worker_claims(worker_id: str):
    """Worker views their submitted claims."""
    rows = claim_repository.get_by_worker(worker_id.upper())
    return [ClaimResponse(**r) for r in rows]


@router.patch("/claims/{claim_id}", response_model=ClaimResponse)
def update_claim(claim_id: str, req: UpdateClaimRequest):
    """Employer approves or rejects a claim."""
    if req.status not in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail="status must be approved or rejected.")
    row = claim_repository.update_status(claim_id.upper(), req.status)
    if not row:
        raise HTTPException(status_code=404, detail=f"Claim '{claim_id}' not found.")
    return ClaimResponse(**row)
