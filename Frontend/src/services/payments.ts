import api from "./api";
import type {
  PaymentHistoryResponse,
  PaymentStats,
  SendPaymentRequest,
  SendPaymentResponse,
  WithdrawRequest,
} from "../types";

/** Fetch payment history for a Stellar account. */
export function getPaymentHistory(
  publicKey: string,
  limit = 20,
  cursor?: string,
) {
  const params: Record<string, string | number> = { limit };
  if (cursor) params.cursor = cursor;
  return api.get<PaymentHistoryResponse>(
    `/api/v1/payments/${publicKey}`,
    params,
  );
}

/** Fetch aggregate payment stats for a Stellar account. */
export function getPaymentStats(publicKey: string) {
  return api.get<PaymentStats>(`/api/v1/payments/${publicKey}/stats`);
}

/**
 * Send XLM from a registered account to any Stellar address.
 * The backend decrypts the sender's secret, signs, and submits.
 */
export function sendPayment(data: SendPaymentRequest) {
  return api.post<SendPaymentResponse>("/api/v1/payments/send", data);
}

/** Withdraw funds via the platform account (legacy). */
export function withdraw(data: WithdrawRequest) {
  return api.post<{ submitted?: boolean; unsigned_xdr?: string }>(
    "/api/v1/payments/withdraw",
    data,
  );
}
