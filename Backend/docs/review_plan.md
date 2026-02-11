# Review System — Implementation Plan (NFT + PDF on IPFS)

## Core Concept
Each review is a **PDF certificate** pinned to IPFS, referenced by a **Stellar NFT**.
The backend is a pure gateway — no review data lives in PostgreSQL.

```
Review submitted
  → Generate PDF certificate (branding, rating, comment, QR code)
  → Pin PDF to IPFS via Pinata → CID
  → Mint Stellar NFT: ManageData { pdf_cid, rating, reviewer_type, role, duration }
  → Lock issuer account (supply provably = 1 forever)
  → Return { ipfs_url, stellar_tx_id, explorer_url }
```

**Source of truth:** IPFS (PDF content) + Stellar (ownership + metadata)
**Tamper-proof:** CID is SHA256 of the PDF — if the PDF changes, the CID changes
**Portable:** Worker's Stellar wallet holds their review NFTs — independent of NannyChain

---

## PDF Certificate Contents

```
┌─────────────────────────────────────────┐
│  🔷 NannyChain                          │
│  Verified Work Review                   │
├─────────────────────────────────────────┤
│  Worker:    Jane Wanjiku  (NW-A1B2)     │
│  Employer:  Verified Employer           │  ← employer identity optional
│  Role:      Childcare                   │
│  Duration:  Jun 2024 – Feb 2025 (8mo)   │
│  Rating:    ★★★★☆  (4/5)               │
├─────────────────────────────────────────┤
│  "Jane was reliable, punctual and       │
│   great with our children."             │
├─────────────────────────────────────────┤
│  Reviewed:  Feb 11, 2025               │
│  [QR CODE]  Verify on Stellar           │
│  TX: abc123...                          │
└─────────────────────────────────────────┘
```

---

## Stellar NFT Structure

```
asset_code    = "RVW" + first 9 chars of SHA256(engagement_id + reviewer_id + timestamp)
                → e.g. "RVWA1B2C3D4"   (max 12 chars)

issuer        = freshly generated keypair per review

ManageData on issuer (before locking):
  "pdf_cid"       → "QmX...ABC"     IPFS CID of the PDF (≤59 bytes, fits)
  "rating"        → "4"
  "reviewer_type" → "employer"
  "role"          → "Childcare"
  "duration"      → "8"             months
  "reviewee"      → worker's stellar public key

supply_lock   = set issuer master_weight = 0  → NFT is provably unique forever
```

> The CID in ManageData is the binding link between the NFT and the PDF.
> Anyone can fetch the PDF from IPFS, recompute its CID, and confirm it matches — no backend needed.

---

## Trustline Approach (Option C — Platform-held)

For hackathon simplicity, the platform account holds all NFTs.
The reviewee's public key is recorded in ManageData (`"reviewee"`).
No trustline friction for workers/employers.

Post-hackathon upgrade: move to Claimable Balances so reviewees hold their own NFTs.

---

## Files to Create

```
app/integrations/stellar/__init__.py    — mint_review_nft(), get_reviews_for_account()
app/integrations/ipfs/__init__.py       — pin_to_ipfs(), get_ipfs_url()
app/services/pdf.py                     — generate_review_pdf()
app/services/review.py                  — orchestration + validation logic
app/schemas/review.py                   — Pydantic request + response shapes
app/api/v1/reviews.py                   — FastAPI router
```

**No model, no repository, no Postgres table for reviews.**

---

## New Dependencies

```
# PDF generation
reportlab==4.1.0

# IPFS pinning
requests==2.31.0        # already present — used for Pinata REST API
```

Add to `.env.example`:
```
PINATA_API_KEY=
PINATA_SECRET_KEY=
PINATA_GATEWAY=https://gateway.pinata.cloud/ipfs/
```

---

## Stellar Integration

### `mint_review_nft(reviewer_keypair, reviewee_public, pdf_cid, metadata) → MintResult`

```
Steps:
  1. Generate fresh issuer keypair
  2. Fund issuer via Friendbot (testnet) or platform account (mainnet)
  3. Build transaction:
       a. CreateAccount (issuer)
       b. ManageData ops: pdf_cid, rating, reviewer_type, role, duration, reviewee
       c. ChangeTrust (platform account trusts the new asset)
       d. Payment: 1 unit of asset → platform account
       e. SetOptions: master_weight = 0 on issuer  ← locks supply
  4. Sign with issuer keypair + platform keypair
  5. Submit to Horizon
  6. Return { asset_code, issuer_public, tx_id }
```

### `get_reviews_for_account(stellar_public) → list[ReviewNFT]`

```
Steps:
  1. GET /accounts/{platform_account} from Horizon
  2. Filter balances: balance == "1", asset_code starts with "RVW"
  3. For each asset:
       GET /accounts/{issuer} → read ManageData
       Filter where ManageData["reviewee"] == stellar_public
  4. Return list of { asset_code, pdf_cid, rating, reviewer_type, role, duration }
```

---

## IPFS Integration

### `pin_to_ipfs(pdf_bytes) → cid`

```
POST https://api.pinata.cloud/pinning/pinFileToIPFS
Headers: pinata_api_key, pinata_secret_api_key
Body: multipart PDF file

Returns: IpfsHash (CID)
```

### `get_ipfs_url(cid) → url`

```
Returns: f"{PINATA_GATEWAY}{cid}"
```

---

## PDF Generation — `generate_review_pdf(review_data) → bytes`

```
Input:
  worker_name, worker_code, role, start_date, end_date,
  rating, comment, reviewer_type, stellar_tx_id

Output: PDF bytes (in-memory, never written to disk)

Library: reportlab
Contents:
  - NannyChain logo + header
  - Worker name + NW-XXXX code
  - Employer type (not name, for privacy)
  - Role + duration
  - Star rating (text-based: ★★★★☆)
  - Comment (full text, no length limit)
  - Review date
  - QR code → Stellar explorer URL for the tx
  - "Verified by NannyChain" footer
```

---

## API Endpoints

### `POST /api/v1/reviews`
Submit a review → generates PDF → pins to IPFS → mints NFT.

**Auth:** JWT

**Body:**
```json
{
  "engagement_id": "uuid",
  "rating": 4,
  "comment": "Jane was reliable, punctual and great with our children."
}
```

**Service flow:**
1. Load engagement → confirm caller is worker or employer on it → 403 if not
2. Check `review_unlocks_at <= now()` → 423 Locked with unlock date
3. Query Horizon: check no existing `RVW*` asset where `reviewee` = reviewee's stellar key and `engagement_id` matches → 409 if duplicate
4. `pdf.generate_review_pdf(review_data)` → PDF bytes
5. `ipfs.pin_to_ipfs(pdf_bytes)` → CID
6. `stellar.mint_review_nft(reviewer_keypair, reviewee_public, cid, metadata)` → tx_id
7. Return result

**Response:**
```json
{
  "asset_code": "RVWA1B2C3D4",
  "pdf_url": "https://gateway.pinata.cloud/ipfs/QmX...ABC",
  "stellar_tx_id": "abc123...",
  "explorer_url": "https://stellar.expert/explorer/testnet/tx/abc123...",
  "message": "Review certificate minted as NFT on Stellar."
}
```

---

### `GET /api/v1/reviews/worker/{worker_code}`
Fetch all reviews for a worker — reads from Horizon + IPFS.

**Auth:** None (public)

**Flow:**
1. Resolve `worker_code` → get `stellar_public` from DB (workers table)
2. `stellar.get_reviews_for_account(stellar_public)` → list of NFTs
3. For each NFT, construct `pdf_url` from `pdf_cid`

**Response:**
```json
[
  {
    "rating": 4,
    "role": "Childcare",
    "duration_months": 8,
    "reviewer_type": "employer",
    "pdf_url": "https://gateway.pinata.cloud/ipfs/QmX...ABC",
    "stellar_asset": "RVWA1B2C3D4",
    "stellar_tx_id": "abc123..."
  }
]
```

---

### `GET /api/v1/reviews/employer/{employer_id}`
Same pattern — filtered to reviews where `reviewer_type = worker`.

**Auth:** JWT (worker)

---

## Error Cases

| Condition                        | Code | Message                                    |
|----------------------------------|------|--------------------------------------------|
| Reviews not yet unlocked         | 423  | "Reviews unlock on {date}"                 |
| Already reviewed this engagement | 409  | "You already reviewed this engagement"     |
| Caller not part of engagement    | 403  | "Not your engagement"                      |
| IPFS pin fails                   | 502  | "Could not store certificate, try again"   |
| Stellar mint fails               | 502  | "Blockchain unavailable, try again"        |

---

## Implementation Order

1. `app/integrations/ipfs/__init__.py` — `pin_to_ipfs()`, `get_ipfs_url()`
2. `app/services/pdf.py` — `generate_review_pdf()`
3. `app/integrations/stellar/__init__.py` — `mint_review_nft()`, `get_reviews_for_account()`
4. `app/services/review.py` — validation + orchestration
5. `app/schemas/review.py` — Pydantic shapes
6. `app/api/v1/reviews.py` — FastAPI router
7. Add `PINATA_API_KEY`, `PINATA_SECRET_KEY`, `PINATA_GATEWAY` to `.env.example`
8. Add `reportlab` to `requirements.txt`
