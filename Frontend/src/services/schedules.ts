import api from "./api";
import type {
  Schedule,
  CreateScheduleRequest,
  PaymentClaim,
  CreateClaimRequest,
} from "../types";

// ─── Schedules ───────────────────────────────────────────────────────

/** Create a recurring scheduled payment. */
export function createSchedule(data: CreateScheduleRequest) {
  return api.post<Schedule>("/api/v1/schedules", data);
}

/** List all schedules created by an employer. */
export function getEmployerSchedules(employerId: string) {
  return api.get<Schedule[]>(`/api/v1/schedules/employer/${employerId}`);
}

/** List active schedules targeting a worker (upcoming payments). */
export function getWorkerSchedules(workerId: string) {
  return api.get<Schedule[]>(`/api/v1/schedules/worker/${workerId}`);
}

/** Pause or cancel a schedule. */
export function updateScheduleStatus(scheduleId: string, status: string) {
  return api.patch<Schedule>(`/api/v1/schedules/${scheduleId}`, { status });
}

// ─── Claims ──────────────────────────────────────────────────────────

/** Worker claims/requests a payment from an employer. */
export function createClaim(data: CreateClaimRequest) {
  return api.post<PaymentClaim>("/api/v1/claims", data);
}

/** Employer views all claims addressed to them. */
export function getEmployerClaims(employerId: string) {
  return api.get<PaymentClaim[]>(`/api/v1/claims/employer/${employerId}`);
}

/** Worker views their submitted claims. */
export function getWorkerClaims(workerId: string) {
  return api.get<PaymentClaim[]>(`/api/v1/claims/worker/${workerId}`);
}

/** Employer approves or rejects a claim. */
export function updateClaimStatus(claimId: string, status: string) {
  return api.patch<PaymentClaim>(`/api/v1/claims/${claimId}`, { status });
}
