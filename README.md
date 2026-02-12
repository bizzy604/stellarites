# KaziChain

**Verified work history & instant payments for domestic workers—powered by Stellar.**

---

## 🏆 Hackathon Submission

KaziChain is a **full-stack platform** that gives domestic workers in Kenya (and beyond) **portable, blockchain-anchored identity** and **low-cost instant payments**. Workers get a Stellar wallet on signup, verifiable employment records, and a path to formal recognition—without relying on slow banks or opaque references.

**Judge-friendly overview:** Problem → Solution → What we built → How to run → What’s next.

---

## The Problem

- **2M+ domestic workers in Kenya**, 85–90% in informal arrangements with **no standard way to prove** experience or payment history.
- **Employers hire blind;** workers **lose reputation** every time they change jobs.
- **Payments are opaque**—no audit trail, high fees, and slow cross-border rails when workers send money home.

Result: a **trust vacuum** that hurts both sides and keeps the sector informal.

---

## Our Solution

**KaziChain** combines three pillars:

1. **Verified identity** — Each user gets a unique Worker ID and a **Stellar keypair** at registration. Identity and key are stored securely; secrets are encrypted in the backend.
2. **Instant, transparent payments** — Stellar settles in **seconds** with **minimal fees**. Workers and employers can send/receive, track history, and use **scheduled payments** and **claims** (e.g. salary advances).
3. **Inclusive access** — **Web app** (React PWA) plus **USSD** (Africa’s Talking) so users without smartphones can still create an account and get a Worker ID.

All of this is designed to scale: same backend services power both the web and USSD flows.

---

## What We Built (Demo-Ready)

| Area | Status | Notes |
|------|--------|------|
| **Account creation** | ✅ | Web signup + USSD; creates Stellar keypair, stores encrypted secret, optional welcome SMS |
| **Worker vs Employer roles** | ✅ | Role chosen at signup; separate dashboards (worker / employer) |
| **Stellar integration** | ✅ | Keypair per user, testnet funding (Friendbot), balance API, M-Pesa on-ramp (fund with KES → KSH) |
| **Payments** | ✅ | Send payment, payment history, deposit/withdraw flows, offramp |
| **Schedules & claims** | ✅ | Recurring scheduled payments; workers can submit claims (e.g. advance); employer approves |
| **Reviews** | ✅ | Submit and fetch reviews; rating aggregation; review-by-worker-ID for verification |
| **USSD** | ✅ | Dial shortcode → Create account / Sign in; Redis-backed sessions; uses same `create_account` as web |
| **CI/CD** | ✅ | GitHub Actions: Backend (Ruff + pytest), Frontend (ESLint + build) |

**Frontend:** Landing page, sign up / sign in, role-based dashboard (worker vs employer), profile, fund modal, withdraw modal, and flows that call the backend APIs.

**Backend:** FastAPI with routes for accounts, payments, stellar (platform key, etc.), schedules, claims, and reviews; USSD handler; PostgreSQL (workers + app data); Redis (USSD sessions); Stellar SDK; Africa’s Talking (SMS/USSD).

---

## Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | React 19, TypeScript, Vite, React Router, Tailwind CSS |
| **Backend** | Python 3.11, FastAPI, Uvicorn |
| **Database** | PostgreSQL (workers, payments, schedules, reviews) |
| **Cache** | Redis (USSD session state) |
| **Blockchain** | Stellar (stellar-sdk): keypairs, balances, payments |
| **SMS / USSD** | Africa’s Talking |
| **Security** | Encrypted Stellar secrets (Fernet), optional USSD API key |

---

## Architecture (High Level)

```
┌─────────────────────────────────────────────────────────────────┐
│  Web (React PWA)  │  USSD (Africa's Talking)  │  Future: Mobile  │
└─────────────┬───────────────────────┬───────────────────────────┘
              │                       │
              ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FastAPI Backend (routes only)                  │
│  /health  /ussd  /api/v1/accounts  /payments  /schedules  /reviews │
└─────────────┬─────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Services (business logic)  →  Repositories (DB)                 │
│  Integrations: Stellar, Africa's Talking                         │
└─────────────┬───────────────────────┬────────────────────────────┘
              │                       │
              ▼                       ▼
┌──────────────────────┐   ┌──────────────────────────────────────┐
│  PostgreSQL          │   │  Redis (USSD sessions)                │
│  Stellar (network)   │   │  Africa's Talking (SMS/USSD)           │
└──────────────────────┘   └──────────────────────────────────────┘
```

- **USSD and Web** both call the same **account creation** and business logic; no duplicate Stellar or DB access in USSD.
- **Stellar secrets** are encrypted at rest; decryption only where needed (e.g. signing payments).

---

## How to Run (Quick Start)

### Prerequisites

- **Node.js 20+** (Frontend)
- **Python 3.11+** (Backend)
- **PostgreSQL** and **Redis**
- (Optional) Africa’s Talking account for SMS/USSD

### 1. Backend

```bash
cd Backend
cp .env.example .env
# Edit .env: DATABASE_URL, REDIS_URL, ENCRYPTION_KEY; optional: AT_*, USSD_API_KEY, STELLAR_* 
pip install -r requirements.txt
# Create DB and run: psql -U your_user -d your_db -f schema.sql
uvicorn app.main:app --reload --host 0.0.0.0 --port 5000
```

- **API docs:** http://localhost:5000/docs  
- **Health:** http://localhost:5000/health  

### 2. Frontend

```bash
cd Frontend
npm install
# Optional: set VITE_API_BASE_URL=http://localhost:5000 in .env
npm run dev
```

- **App:** http://localhost:5173  

### 3. Try the flow

1. Open the app → **Create Free Account** (or **Sign In** if you already have one).
2. Choose **Worker** or **Employer**, enter phone (and name).
3. After signup you’re in the **Dashboard** (worker or employer view).
4. Use **Fund** (e.g. testnet Friendbot or M-Pesa on-ramp) and **Send** to try payments.

**USSD (if configured):** Dial your Africa’s Talking shortcode → Create account / Sign in; same account is created as on web.

---

## API Overview (What Judges Can Hit)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/ussd` | Africa’s Talking USSD callback |
| POST | `/api/v1/accounts/create` | Create account (phone, name, role) → Stellar keypair + DB |
| POST | `/api/v1/accounts/login` | Login by phone |
| GET | `/api/v1/accounts/{publicKey}/balance` | Stellar balances |
| POST | `/api/v1/accounts/{publicKey}/fund` | Testnet Friendbot funding |
| POST | `/api/v1/accounts/{publicKey}/fund-mpesa` | M-Pesa on-ramp (KES → KSH) |
| POST | `/api/v1/send` | Send payment (Stellar) |
| GET | `/api/v1/{publicKey}` | Payment history |
| POST | `/api/v1/schedules` | Create scheduled payment |
| POST | `/api/v1/claims` | Create claim (e.g. advance) |
| POST | `/api/v1/reviews/submit` | Submit review |
| GET | `/api/v1/reviews/for/{user_id}` | Reviews for a user |

Full list and request/response shapes: **http://localhost:5000/docs** (Swagger UI).

---

## Repo Structure (Where to Look)

```
stellarites/
├── README.md                 ← You are here (hackathon submission)
├── docs/
│   └── PRD.md                ← Full Product Requirements Document
├── Frontend/
│   ├── src/
│   │   ├── pages/            ← Home, SignUp, SignIn, Dashboard, Profile, Worker/Employer dashboards
│   │   ├── services/         ← API client (accounts, payments, reviews, session)
│   │   └── components/       ← Navbar, Footer, FundModal, WithdrawModal
│   └── package.json
├── Backend/
│   ├── app/
│   │   ├── main.py            ← FastAPI app, CORS, /health, /ussd, router includes
│   │   ├── routes/            ← accounts, payments, stellar, schedules, reviews
│   │   ├── services/          ← user_service, account, payments
│   │   ├── ussd/              ← USSD menu handler
│   │   ├── integrations/      ← stellar (wallet), africastalking (SMS)
│   │   └── db/                ← repositories
│   ├── schema.sql             ← DB schema (workers, etc.)
│   ├── docs/
│   │   └── architecture.md   ← Backend architecture and data flow
│   └── README.md              ← Backend setup, env, USSD flow
└── .github/workflows/
    └── ci.yml                 ← Lint + test (Backend + Frontend)
```

---

## What’s Next (Post–Hackathon)

- **PWA + offline:** Service worker and installability for low-connectivity users.
- **QR verification:** Generate and verify QR codes linking Worker ID + Stellar account.
- **M-Pesa deep integration:** Deposit/withdraw with real M-Pesa callbacks in production.
- **Profile enrichment:** Skills, experience level, profile hash on Stellar for portable credentials.
- **REST consistency:** Ensure every USSD action that needs it has a corresponding REST endpoint for the web/mobile app.

---

## Documentation & References

- **Full PRD (personas, requirements, success metrics):** [docs/PRD.md](docs/PRD.md)
- **Backend setup, env vars, USSD:** [Backend/README.md](Backend/README.md)
- **Backend architecture and data flow:** [Backend/docs/architecture.md](Backend/docs/architecture.md)

---

## License

See [LICENSE](LICENSE) in the repo (if present). Built for the Stellar hackathon.

---

**Thank you to the judges.** We hope KaziChain clearly demonstrates a real-world use case for Stellar: **verifiable identity and fast, low-cost payments for an underserved workforce.**
