# PayTrace Backend — Team Onboarding

Welcome to the **PayTrace Unified Backend API**, the core backend powering:

- Web Application (React PWA)
- **USSD Interface (Africa's Talking)** — implemented
- **Stellar wallet mapping on account creation** — implemented
- **Africa's Talking SMS** (welcome/OTP) — implemented
- M-Pesa Deposits & Withdrawals (planned)
- PostgreSQL Database
- Redis (USSD session storage)

The backend uses a **layered architecture**: business logic lives in **services**; **USSD** is a thin client that calls the same services. USSD never talks to Stellar or the DB directly.

---

## Architecture Overview

```
USSD / Web Client  →  Backend API (FastAPI)  →  Services  →  DB / Redis / Stellar / Africa's Talking
```

**Rules:**

- Routes handle HTTP only.
- Services contain business logic (e.g. `create_account`).
- Integrations handle external APIs (Stellar, Africa's Talking, M-Pesa when added).
- Repositories handle DB operations only.
- USSD must never call Stellar or PostgreSQL directly.

---

## Project Structure

```
Backend/
├── app/
│   ├── main.py              # FastAPI app: /health, POST /ussd
│   ├── config/              # Config from env (Config class)
│   ├── api/v1/              # (Future REST API)
│   ├── services/
│   │   └── user_service.py  # create_account(phone, name, send_sms)
│   ├── integrations/
│   │   ├── stellar/         # create_wallet_for_user, encrypt/decrypt secret
│   │   │   └── wallet.py
│   │   ├── africastalking/ # send_sms
│   │   │   └── sms.py
│   │   └── mpesa/           # (Planned)
│   ├── ussd/
│   │   └── handler.py       # USSD menu flow, Redis session
│   ├── db/
│   │   ├── __init__.py      # get_connection()
│   │   └── repositories/
│   │       └── worker_repository.py  # create_worker, get_worker_by_phone
│   ├── models/
│   ├── schemas/
│   └── ...
├── schema.sql               # workers table (worker_id, phone, stellar_*, ...)
├── docs/
│   └── architecture.md
├── .env.example
├── requirements.txt
└── docker-compose.yml
```

---

## What’s Implemented

| Area | Status | Notes |
|------|--------|--------|
| **Account creation** | Done | Via USSD “Create account” or service `create_account()` |
| **Stellar wallet per user** | Done | One keypair per worker; secret stored encrypted in DB |
| **USSD menus** | Done | Main → Create account / Sign in / Exit; phone collection |
| **Africa’s Talking SMS** | Done | Welcome SMS after registration (when AT credentials set) |
| **Redis USSD sessions** | Done | Key `ussd:session:{sessionId}`, TTL configurable |
| **POST /ussd** | Done | Africa’s Talking callback; optional `Authorization: Bearer <USSD_API_KEY>` |
| **Worker table** | Done | `workers`: worker_id, phone, stellar_public_key, stellar_secret_encrypted |
| REST API (register, balance, etc.) | Planned | Use same `user_service` and repositories |
| M-Pesa | Planned | Callbacks and endpoints documented for later |

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| API | FastAPI |
| Database | PostgreSQL (psycopg2) |
| Cache & USSD sessions | Redis |
| Blockchain | Stellar (stellar-sdk) |
| SMS + USSD provider | Africa's Talking |
| Encryption | cryptography (Fernet for Stellar secrets) |

---

## Getting Started

### 1. Environment

```bash
cp .env.example .env
```

Edit `.env`. Required for current features:

- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection string
- `ENCRYPTION_KEY` — Any string; used to derive key for encrypting Stellar secrets

Optional:

- `AT_USERNAME`, `AT_API_KEY` — Africa's Talking (for welcome SMS)
- `USSD_API_KEY` — If set, `POST /ussd` requires `Authorization: Bearer <USSD_API_KEY>`
- `STELLAR_NETWORK` — `TESTNET` (default) or `PUBLIC`
- `STELLAR_FUNDING_SECRET` — Testnet only: secret of account that funds new wallets with 1 KSH
- `USSD_SESSION_TTL` — Seconds (default 180)

### 2. Database

Create the database, then load the schema:

```bash
psql -U nannychain -d nannychain -f schema.sql
```

Or rely on Docker to start Postgres and run schema if your setup does that.

### 3. Run the app

```bash
cd Backend
python -m venv venv
# Windows: venv\Scripts\activate
# Linux/Mac: source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 5000
```

Or: `python run.py`

API base: `http://localhost:5000`. Swagger UI: `http://localhost:5000/docs`

---

## API Endpoints (Current)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check; returns `{"status":"ok"}` |
| POST | `/ussd` | Africa's Talking USSD callback (form: sessionId, phoneNumber, text) |
| GET | `/docs` | Swagger UI (interactive API docs) |
| GET | `/openapi.json` | OpenAPI 3 schema |

---

## USSD Flow (Implemented)

1. User dials shortcode → Africa's Talking sends `POST /ussd` with `sessionId`, `phoneNumber`, `text`.
2. **First request** (`text` empty): show main menu:
   - 1. Create account  
   - 2. Sign in  
   - 3. Exit  
3. **Create account (1)**: prompt for phone → user enters number → backend calls `create_account(phone)`, which:
   - Creates Stellar keypair (and funds on testnet if `STELLAR_FUNDING_SECRET` is set),
   - Saves worker in DB (worker_id, phone, stellar_public_key, stellar_secret_encrypted),
   - Optionally sends welcome SMS via Africa's Talking.
4. **Sign in (2)**: prompt for phone → look up worker → respond with Worker ID.
5. Responses are plain text: `CON ...` (continue) or `END ...` (end session).

### USSD testing

- Use Africa's Talking sandbox, a USSD shortcode, and set callback URL to your public URL, e.g. `https://<ngrok-or-domain>/ussd`.
- For local dev: `ngrok http 5000` then set that HTTPS URL in Africa's Talking.
- If `USSD_API_KEY` is set, send header: `Authorization: Bearer <USSD_API_KEY>` (Africa's Talking may need a proxy that adds this).

---

## Redis (USSD sessions)

- Key: `ussd:session:{sessionId}`
- TTL: from `USSD_SESSION_TTL` (default 180 seconds)
- Value: JSON with `step` and any flow state

---

## Stellar

- **On registration**: each new worker gets a Stellar keypair via `create_wallet_for_user()` (in `app/integrations/stellar/wallet.py`). Public key stored in clear; secret encrypted with `ENCRYPTION_KEY` and stored in `workers.stellar_secret_encrypted`.
- **Testnet**: If `STELLAR_FUNDING_SECRET` is set, new accounts are funded with 1 KSH from that account. Otherwise keypair is still created; you can fund via [Friendbot](https://laboratory.stellar.org/#explorer?resource=friendbot&endpoint=friendbot) or your own flow.
- **Decryption**: Use `decrypt_secret(encrypted)` only when needed for signing transactions (e.g. in a future payments service).

---

## Security

- Stellar secret keys: stored encrypted in PostgreSQL; decrypted only when needed.
- USSD: optional `USSD_API_KEY`; if set, `POST /ussd` must send `Authorization: Bearer <USSD_API_KEY>`.

---

## Planned Endpoints (for reference)

When implemented, these should use the same services/repositories:

- `POST /api/v1/workers/register` — web registration (call `create_account`)
- `GET /api/v1/workers/by-phone/{phone}`
- M-Pesa: `POST /mpesa/deposit/callback`, `POST /mpesa/b2c/result`
- Financial / escrow / reviews endpoints as per product spec

---

## Documentation

- **Architecture and data flow**: `docs/architecture.md`
- **Environment variables**: `.env.example` (with comments)

---

## Development and CI

- **Lint and format:** `ruff check app tests && ruff format app tests` (or `make format` from Backend).
- **Tests:** `pytest` (or `make test` from Backend). No Redis/DB needed for current tests (USSD session is mocked).
- **Pre-commit:** From repo root, see [CONTRIBUTING.md](../CONTRIBUTING.md) for optional pre-commit hooks.
- **CI:** GitHub Actions runs on push/PR to `main`: Backend (Ruff + Pytest), Frontend (ESLint + build). See `.github/workflows/ci.yml`.

## Running tests

```bash
cd Backend
pip install -r requirements-dev.txt
pytest -v
```

Tests live in `tests/`.
