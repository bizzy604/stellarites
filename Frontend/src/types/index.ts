// ─── Account / Auth ──────────────────────────────────────────────────
export interface CreateAccountRequest {
  phone: string;
  name?: string;
  role: "worker" | "employer";
  send_sms?: boolean;
}

export interface AccountResponse {
  worker_id: string;
  stellar_public_key: string;
  phone: string;
  name: string;
  role: "worker" | "employer";
  already_exists: boolean;
}

export interface LoginRequest {
  phone: string;
}

export interface LoginResponse {
  worker_id: string;
  stellar_public_key: string;
  phone: string;
  name: string;
  role: "worker" | "employer";
}

// ─── Balance ─────────────────────────────────────────────────────────
export interface BalanceItem {
  asset_type: string;
  asset_code?: string;
  balance: string;
}

export interface BalanceResponse {
  public_key: string;
  balances: BalanceItem[];
}

// ─── Profile ─────────────────────────────────────────────────────────
export interface WorkerProfile {
  public_key: string;
  worker_type?: string;
  skills: string[];
  experience?: string;
  ipfs_profile_hash?: string;
  name?: string;
  phone_hash?: string;
  role?: string;
}

// ─── Payments ────────────────────────────────────────────────────────
export interface PaymentRecord {
  id: string;
  from_account: string;
  to_account: string;
  from_worker_id?: string;
  to_worker_id?: string;
  amount: string;
  asset_type: string;
  asset_code?: string;
  created_at: string;
  transaction_hash: string;
  explorer_url: string;
}

export interface PaymentHistoryResponse {
  payments: PaymentRecord[];
  total_count: number;
  cursor?: string;
}

export interface PaymentStats {
  total_received: number;
  total_sent: number;
  received_count: number;
  sent_count: number;
  unique_senders: number;
  unique_recipients: number;
}

export interface WithdrawRequest {
  destination: string;
  amount: string;
}

export interface SendPaymentRequest {
  sender: string;            // NW-XXXX worker ID or G… Stellar public key
  destination: string;       // NW-XXXX worker ID or G… Stellar public key
  amount: string;
  memo?: string;
}

export interface SendPaymentResponse {
  successful: boolean;
  tx_hash?: string;
  explorer_url: string;
  amount: string;
  from_account: string;
  to_account: string;
  from_worker_id?: string;
  to_worker_id?: string;
}

// ─── Resolve ──────────────────────────────────────────────────────────
export interface ResolveResponse {
  worker_id: string;
  stellar_public_key: string;
  name: string;
  role: string;
}

// ─── Schedules ───────────────────────────────────────────────────────
export interface Schedule {
  id: number;
  schedule_id: string;
  employer_id: string;
  worker_id: string;
  amount: string;
  frequency: "weekly" | "biweekly" | "monthly";
  next_payment_date: string;
  status: "active" | "paused" | "cancelled";
  memo: string;
  created_at: string;
}

export interface CreateScheduleRequest {
  employer_id: string;
  worker_id: string;
  amount: string;
  frequency: "weekly" | "biweekly" | "monthly";
  next_payment_date?: string;
  memo?: string;
}

// ─── Claims ──────────────────────────────────────────────────────────
export interface PaymentClaim {
  id: number;
  claim_id: string;
  schedule_id?: string;
  worker_id: string;
  employer_id: string;
  amount: string;
  message: string;
  status: "pending" | "approved" | "rejected" | "paid";
  created_at: string;
}

export interface CreateClaimRequest {
  schedule_id?: string;
  worker_id: string;
  employer_id: string;
  amount: string;
  message?: string;
}

// ─── Reviews ─────────────────────────────────────────────────────────
export interface ReviewData {
  rating: number;
  role: string;
  duration_months: number;
  reviewer_type: string;
  pdf_url: string;
  stellar_asset: string;
  stellar_issuer: string;
  stellar_tx_id: string;
  status: string;
}

// ─── Local session (stored in localStorage) ──────────────────────────
export interface UserSession {
  worker_id: string;
  stellar_public_key: string;
  phone: string;
  name: string;
  role: "worker" | "employer";
}
