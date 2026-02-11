```markdown
# 🧾 NannyChain Backend — README.md (Team Onboarding)

Welcome to the **NannyChain Unified Backend API**, the core backend powering:

- 🌐 Web Application (React PWA)
- 📞 USSD Interface (Africa’s Talking)
- 💳 M-Pesa Deposits & Withdrawals
- 🔗 Stellar Blockchain Escrow & Payments
- 🗄️ PostgreSQL Database
- ⚡ Redis Cache & USSD Session Storage

This backend follows a **clean layered architecture** where all business logic lives inside the API, and USSD acts as a **thin presentation client**.

---

# 📌 Architecture Overview

## Correct Design Flow

```

USSD/Web Client → Backend API → Services → DB / Redis / Stellar / M-Pesa

```

### Key Rules
✅ Routes handle HTTP only  
✅ Services contain business logic  
✅ Integrations handle external APIs (Stellar, M-Pesa, Africa’s Talking)  
✅ Repositories handle DB operations only  
❌ USSD must never talk to Stellar directly  
❌ USSD must never query PostgreSQL directly  

---

# 📁 Project Structure

```

nannychain-backend/
│
├── app/
│   ├── main.py
│   ├── config/
│   ├── api/
│   │   └── v1/
│   ├── services/
│   ├── integrations/
│   │   ├── stellar/
│   │   ├── mpesa/
│   │   └── africastalking/
│   ├── ussd/
│   ├── db/
│   │   ├── repositories/
│   │   └── migrations/
│   ├── cache/
│   ├── models/
│   ├── schemas/
│   ├── utils/
│   ├── middlewares/
│   └── exceptions/
│
├── tests/
├── docs/
├── scripts/
├── docker/
│   ├── Dockerfile
│   └── entrypoint.sh
│
├── schema.sql
├── docker-compose.yml
├── requirements.txt
├── .env.example
├── Makefile
└── README.md

````

---

# ⚙️ Tech Stack

| Component | Technology |
|----------|------------|
| API Framework | Flask / FastAPI |
| Database | PostgreSQL |
| Cache & Sessions | Redis |
| Blockchain | Stellar |
| Payments | M-Pesa STK Push + B2C |
| SMS + USSD | Africa’s Talking |
| Containerization | Docker + Docker Compose |

---

# 🚀 Getting Started (Local Setup)

## 1. Clone Repository

```bash
git clone https://github.com/your-org/nannychain-backend.git
cd nannychain-backend
````

---

## 2. Setup Environment Variables

Copy `.env.example`:

```bash
cp .env.example .env
```

Fill values inside `.env`.

---

## 3. Run Docker Compose

```bash
docker compose up --build
```

This will start:

* PostgreSQL
* Redis
* Backend API

---

# 🧪 Running Locally Without Docker (Optional)

## 1. Create Virtual Environment

```bash
python -m venv venv
source venv/bin/activate    # Linux/Mac
venv\Scripts\activate       # Windows
```

## 2. Install Dependencies

```bash
pip install -r requirements.txt
```

## 3. Run Application

```bash
python app/main.py
```

---

# 🌍 API Base URL

When running locally:

```
http://localhost:5000
```

---

# 📡 Important API Endpoints

## Health Check

```
GET /health
```

---

## Worker Endpoints

```
POST /api/v1/workers/register
GET  /api/v1/workers/by-phone/{phone}
GET  /api/v1/workers/work-history/by-phone/{phone}
```

---

## Financial Endpoints

```
GET  /api/v1/financial/balance/by-phone/{phone}
POST /api/v1/financial/deposit/initiate
POST /api/v1/financial/withdraw
GET  /api/v1/financial/history/by-phone/{phone}
```

---

## Payment Escrow Endpoints

```
GET  /api/v1/payments/escrow/pending/by-phone/{phone}
POST /api/v1/payments/escrow/claim
```

---

## Reviews Endpoints

```
GET /api/v1/reviews/reputation/by-phone/{phone}
```

---

## USSD Entry Point

```
POST /ussd
```

---

## M-Pesa Callbacks

```
POST /mpesa/deposit/callback
POST /mpesa/b2c/result
```

---

# 📞 USSD Testing Setup

USSD is integrated using Africa’s Talking.

### Local testing requires:

* Africa’s Talking Sandbox account
* USSD shortcode (e.g. `*384*96#`)
* Ngrok tunnel

---

## Start Ngrok

```bash
ngrok http 5000
```

Set Africa’s Talking callback URL to:

```
https://xxxx.ngrok.io/ussd
```

---

# 🗄️ Database Setup

Database schema is located at:

```
schema.sql
```

Docker automatically loads it when PostgreSQL boots.

To manually run schema:

```bash
psql -U nannychain -d nannychain -f schema.sql
```

---

# ⚡ Redis Session Storage (USSD)

USSD sessions are stored in Redis:

```
ussd:session:{sessionId}
```

TTL is enforced (default: 180 seconds).

---

# 🔐 Security Notes

### Stellar Secret Keys

* Stored encrypted in PostgreSQL
* Decrypted only when needed for transactions

### API Authentication

* USSD uses API key header:

```
Authorization: Bearer <USSD_API_KEY>
```

---

# 🧪 Running Tests

All tests are located in:

```
tests/
```

Run tests:

```bash
pytest -v
```

---

# 🛠️ Common Developer Commands (Makefile)

Example `Makefile` usage:

```bash
make up          # docker compose up
make down        # docker compose down
make test        # run tests
make lint        # lint project
make format      # auto-format
```

---

# 📦 Deployment Checklist

## Required Production Services

* PostgreSQL (Managed recommended)
* Redis (Managed recommended)
* Public HTTPS domain (required for M-Pesa callbacks)

---

## Required Environment Variables

Ensure production `.env` includes:

* `DATABASE_URL`
* `REDIS_URL`
* `MPESA_CONSUMER_KEY`
* `MPESA_CONSUMER_SECRET`
* `MPESA_PASSKEY`
* `AT_USERNAME`
* `AT_API_KEY`
* `SECRET_KEY`
* `ENCRYPTION_KEY`
* `STELLAR_NETWORK`
* `USSD_API_KEY`

---

# 📄 Documentation

All technical docs live in:

```
docs/
```

Recommended docs:

* `architecture.md`
* `deployment.md`
* `ussd_flow.md`
* `database_schema.md`

---

# 👥 Team Contribution Rules

## Branching

* `main` → production-ready
* `dev` → staging integration
* feature branches:

  * `feature/worker-registration`
  * `feature/mpesa-withdraw`
  * `feature/ussd-menus`

---

## Code Ownership Boundaries

* `/api/` = controllers only
* `/services/` = business logic only
* `/integrations/` = external communication only
* `/db/repositories/` = CRUD only
* `/ussd/` = UI + session + API orchestration only

---

# ✅ Final Notes

This backend is designed to be:

* Highly maintainable
* Secure by default
* Easily scalable
* Testable in isolation
* Unified across Web + USSD

---

# 📌 Maintainers

* Backend Lead: __________________
* Payments Engineer: __________________
* Blockchain Engineer: __________________
* USSD Engineer: __________________
* QA Engineer: __________________

```

If you want, I can also generate:
✅ `docs/architecture.md`  
✅ `docs/api_endpoints.md`  
✅ `Makefile` template  
✅ `requirements.txt` baseline (Flask/FastAPI + Redis + SQLAlchemy + httpx)
```
