import api from "./api";
import type {
  CreateAccountRequest,
  AccountResponse,
  LoginRequest,
  LoginResponse,
  BalanceResponse,
  WorkerProfile,
  ResolveResponse,
} from "../types";

/** Create a new account (Stellar keypair is generated server-side). */
export function createAccount(data: CreateAccountRequest) {
  return api.post<AccountResponse>("/api/v1/accounts/create", data);
}

/** Log in by phone – returns the existing account or 404. */
export function login(data: LoginRequest) {
  return api.post<LoginResponse>("/api/v1/accounts/login", data);
}

/** Fetch live balances from the Stellar network. */
export function getBalance(publicKey: string) {
  return api.get<BalanceResponse>(`/api/v1/accounts/${publicKey}/balance`);
}

/** Fetch worker/employer profile (Stellar account data + DB). */
export function getProfile(publicKey: string) {
  return api.get<WorkerProfile>(`/api/v1/accounts/profile/${publicKey}`);
}

/** Resolve a worker ID (NW-XXXX) or Stellar public key to account details. */
export function resolveAccount(identifier: string) {
  return api.get<ResolveResponse>(`/api/v1/accounts/resolve/${encodeURIComponent(identifier)}`);
}

/** Fund a testnet account via Friendbot (adds 10,000 KSH). */
export function fundAccount(publicKey: string) {
  return api.post<{ funded: boolean; message: string }>(`/api/v1/accounts/${publicKey}/fund`, {});
}

/** Fund a Stellar account via M-Pesa on-ramp (pay KES, receive KSH). */
export function fundAccountMpesa(
  publicKey: string,
  data: { amount: number; phone: string }
) {
  return api.post<{
    funded: boolean;
    message: string;
    transaction_id: string;
    amount_ksh: string;
    amount_kes: string;
    provider: string;
  }>(`/api/v1/accounts/${publicKey}/fund-mpesa`, data);
}
