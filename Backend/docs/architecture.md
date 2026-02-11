# NannyChain Backend Architecture

This document describes the current backend implementation so the team stays aligned.

---

## High-level flow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────────────────────┐
│  USSD / Web     │────▶│  Flask (main.py)  │────▶│  Services (user_service, etc.)        │
│  Client         │     │  Routes only      │     │  Business logic                        │
└─────────────────┘     └──────────────────┘     └───────────────┬───────────────────────┘
                                                                │
                    ┌────────────────────────────────────────────┼────────────────────────────────────────────┐
                    │                                            │                                            │
                    ▼                                            ▼                                            ▼
         ┌──────────────────┐                        ┌──────────────────┐                        ┌──────────────────┐
         │  DB (PostgreSQL) │                        │  Redis           │                        │  Integrations    │
         │  workers table   │                        │  USSD sessions   │                        │  Stellar, AT     │
         │  repositories   │                        │  ussd:session:*  │                        │  (M-Pesa later)  │
         └──────────────────┘                        └──────────────────┘                        └──────────────────┘
```

- **USSD** and (future) **Web API** are thin: they parse requests and call **services**.
- **Services** contain all business logic (e.g. “create account” = create Stellar wallet + save worker + send SMS).
- **Integrations** talk to external systems (Stellar, Africa’s Talking). **Repositories** talk to the DB. Services use both; routes never call DB or Stellar directly.

---

## Components

### Flask app (`app/main.py`)

- **GET /health** — Health check.
- **POST /ussd** — USSD callback for Africa’s Talking. Reads form fields `sessionId`, `phoneNumber`, `text`. Optionally enforces `Authorization: Bearer <USSD_API_KEY>`. Returns plain-text CON/END response.

All config comes from `app.config.Config` (env via `.env`).

### Config (`app/config/__init__.py`)

- `DATABASE_URL`, `REDIS_URL`
- `STELLAR_NETWORK`, `STELLAR_FUNDING_SECRET`
- `ENCRYPTION_KEY` (used to derive Fernet key for Stellar secrets)
- `AT_USERNAME`, `AT_API_KEY`
- `USSD_API_KEY`, `USSD_SESSION_TTL`

### Stellar integration (`app/integrations/stellar/`)

- **create_wallet_for_user()** — Generates a Stellar keypair. On testnet with `STELLAR_FUNDING_SECRET` set, funds the new account with 1 XLM. Returns `(public_key, encrypted_secret)`.
- **encrypt_secret(secret)** / **decrypt_secret(encrypted)** — Fernet encryption derived from `ENCRYPTION_KEY`. Used to store and later retrieve the Stellar secret for a worker.

Stellar is used only from **services** (e.g. when creating an account), never from USSD or routes directly.

### Africa’s Talking (`app/integrations/africastalking/`)

- **send_sms(to, message)** — Sends SMS. Phone normalized to 254XXXXXXXXX. Used by the account-creation flow to send a welcome SMS after registration.

### User / account service (`app/services/user_service.py`)

- **create_account(phone, name=None, send_sms=True)**  
  - If a worker with that phone exists, returns existing worker info.  
  - Otherwise: calls Stellar `create_wallet_for_user()`, then `worker_repository.create()` to store worker_id, phone, stellar_public_key, stellar_secret_encrypted.  
  - If `send_sms` and AT credentials are set, sends a welcome SMS.  
  - Returns dict with `worker_id`, `stellar_public_key`, `phone`, and `already_exists`.

This is the **single place** where “new account → Stellar wallet” happens. Both USSD and (when added) web registration should call this.

### Worker repository (`app/db/repositories/worker_repository.py`)

- **create(phone, stellar_public_key, stellar_secret_encrypted, name=None)** — Inserts into `workers`; generates `worker_id` (format NW-XXXXXXXX). Returns created row as dict.
- **get_by_phone(phone)** — Returns worker dict or None.

DB connection from `app.db.get_connection()` using `Config.DATABASE_URL`.

### USSD handler (`app/ussd/handler.py`)

- **get_session(session_id)** / **set_session(session_id, data)** — Redis get/set for key `ussd:session:{sessionId}` with TTL from config.
- **handle_ussd(session_id, phone_number, text)** — Implements the menu:
  - Empty `text` → main menu (1 Create account, 2 Sign in, 3 Exit).
  - Step “register_phone”: user sends phone → `create_account(phone)` → END with Worker ID (and optional SMS).
  - Step “login_phone”: user sends phone → `get_worker_by_phone(phone)` → END with Worker ID or “no account”.

USSD does not call Stellar or raw DB; it only calls the **user service** and **worker repository** (for read on login).

### Database schema (`schema.sql`)

**workers**

| Column                   | Type         | Description                          |
|--------------------------|--------------|--------------------------------------|
| id                       | SERIAL       | Primary key                          |
| worker_id                | VARCHAR(20)  | Unique, format NW-XXXXXXXX           |
| phone                    | VARCHAR(20)  | Unique                               |
| name                     | VARCHAR(255) | Optional                             |
| stellar_public_key       | VARCHAR(56)  | Stellar account public key           |
| stellar_secret_encrypted | TEXT         | Encrypted Stellar secret             |
| created_at               | TIMESTAMPTZ  | Default NOW()                        |

Indexes on `phone` and `worker_id`.

---

## Data flow: “Create account” (USSD)

1. User selects “1. Create account” and then enters phone.
2. Africa’s Talking sends `POST /ussd` with `text` = "1*254712345678" (or similar).
3. `main.py` → `handle_ussd(session_id, phone_number, text)`.
4. Handler sees step `register_phone`, normalizes phone, calls `create_account(phone, send_sms=True)`.
5. **user_service.create_account**:
   - Calls `create_wallet_for_user()` → gets `(public_key, encrypted_secret)`.
   - Calls `create_worker(phone, public_key, encrypted_secret, name=None)` → DB insert.
   - Calls `send_sms(phone, welcome_message)` (if AT configured).
6. Returns dict to handler; handler responds `END Account created. Worker ID: NW-...`.
7. Same flow can be reused for a future `POST /api/v1/workers/register` by having that route call `create_account()`.

---

## Environment summary

| Variable                 | Required for | Description                                      |
|--------------------------|--------------|--------------------------------------------------|
| DATABASE_URL             | All          | PostgreSQL connection string                     |
| REDIS_URL                | USSD         | Redis connection string                          |
| ENCRYPTION_KEY           | Stellar      | Any string; used to derive Fernet key            |
| AT_USERNAME, AT_API_KEY  | SMS          | Africa’s Talking                                 |
| USSD_API_KEY             | Optional     | If set, required on POST /ussd                   |
| STELLAR_NETWORK          | Stellar      | TESTNET or PUBLIC                                |
| STELLAR_FUNDING_SECRET   | Testnet fund | Secret of account that funds new wallets (1 XLM) |
| USSD_SESSION_TTL         | USSD         | Session TTL in seconds (default 180)             |

---

## Planned extensions

- **REST API** under `app/api/v1/`: worker registration (call `create_account`), get by phone, work history, etc.
- **M-Pesa**: callback routes and services using `app/integrations/mpesa/`.
- **Payments / escrow**: use `decrypt_secret()` in a dedicated service when building Stellar transactions; never expose secrets to clients or USSD.

Keeping this doc updated as new routes and services are added will keep the team on the same page.
