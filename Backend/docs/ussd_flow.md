# USSD Flow

This document describes how the NannyChain USSD flow works end-to-end.

---

## Overview

1. The user dials the Africa's Talking shortcode (e.g. `*384*96#`).
2. Africa's Talking sends **POST /ussd** to the backend with:
   - **sessionId** — Identifies the session (same for the whole call).
   - **phoneNumber** — The caller's number.
   - **text** — The user's input so far, with steps separated by `*` (e.g. `""`, `"1"`, `"1*254712345678"`).
3. The backend keeps **session state** (current menu step) and returns plain text:
   - **CON &lt;text&gt;** — Show the message and wait for the next input (session continues).
   - **END &lt;text&gt;** — Show the message and end the session.

Session state is stored in **Redis** if `REDIS_URL` is set; otherwise an **in-memory** store is used. **Redis is not required** for development or single-instance deployments (see [Session storage](#session-storage) below).

---

## Step-by-step flow

### 1. First request (no input)

- **Request:** `text` is empty (user has just dialed).
- **Backend:** Treats this as the main menu, sets `step = "main"` in the session, and returns:
  - **CON**  
    Welcome to NannyChain  
    1. Create account  
    2. Sign in  
    3. Exit  

---

### 2. User selects from main menu

- **Request:** e.g. `text = "1"` (user pressed 1).
- **Backend:** Sees `step == "main"` and `choice == "1"`:
  - Sets `step = "register_phone"` and saves the session.
  - Returns **CON** "Enter your phone number (e.g. 254712345678)".

Similarly:

- **`text = "2"`** — Sets `step = "login_phone"`, returns **CON** "Enter your phone number".
- **`text = "3"`** — Returns **END** "Goodbye." (no session update).
- Any other choice — **END** "Invalid option. Try again."

---

### 3. Create account (option 1)

- **Request:** e.g. `text = "1*254712345678"` (user chose 1, then entered a phone number).
- **Backend:** Sees `step == "register_phone"`, takes the last segment as the phone number:
  - Normalizes to `254XXXXXXXXX`.
  - If invalid (e.g. fewer than 10 digits) — **END** "Invalid phone number. Use format 254712345678."
  - Otherwise calls **`create_account(phone, send_sms=True)`**:
    - Creates a Stellar keypair and stores the worker in the DB (worker_id, phone, stellar keys).
    - Optionally sends a welcome SMS via Africa's Talking.
  - Resets the session to `main`.
  - If the worker already existed — **END** "Account already exists. Worker ID: NW-…"
  - Else — **END** "Account created. Worker ID: …. Check SMS for details."
  - On error — **END** "Registration failed. Please try again later."

---

### 4. Sign in (option 2)

- **Request:** e.g. `text = "2*254712345678"`.
- **Backend:** Sees `step == "login_phone"`, takes the phone from the input:
  - Looks up the worker by phone.
  - Resets the session to `main`.
  - If not found — **END** "No account found for this number. Create an account first (option 1)."
  - If found — **END** "Signed in. Worker ID: &lt;worker_id&gt;."

---

## Flow diagram

```
Dial shortcode
    -> POST /ussd (text="")
    -> CON: 1.Create account / 2.Sign in / 3.Exit

User presses 1
    -> POST /ussd (text="1")
    -> CON: Enter your phone number

User enters 254712345678
    -> POST /ussd (text="1*254712345678")
    -> create_account(phone) -> DB + Stellar + optional SMS
    -> END: Account created. Worker ID: NW-XXXXXXXX...

OR user presses 2
    -> POST /ussd (text="2")
    -> CON: Enter your phone number
    -> POST /ussd (text="2*254712345678")
    -> get_worker_by_phone(phone)
    -> END: Signed in. Worker ID: ...  OR  END: No account found...
```

---

## Session storage

**Redis is optional.**

- **If `REDIS_URL` is set** — Session state is stored in Redis:
  - Key: `ussd:session:{sessionId}`
  - TTL: `USSD_SESSION_TTL` seconds (default 180).
  - Use Redis for production with multiple instances or when you need sessions to survive restarts.

- **If `REDIS_URL` is empty or not set** — Session state is stored **in memory** in the application process:
  - Sessions work for development and single-instance deployments.
  - Sessions are lost on process restart and are not shared across multiple backend instances.
  - TTL is still applied in memory.

You can run USSD **without Redis**; set `REDIS_URL` when you need shared or persistent session storage.

---

## Implementation references

- **Entry:** **POST /ussd** in `app/main.py` (FastAPI) — reads `sessionId`, `phoneNumber`, `text` from the form body and optional **Authorization** header.
- **Logic:** `app/ussd/handler.py` — `handle_ussd(session_id, phone_number, text)` implements the steps above, phone normalization, and calls `create_account` and `get_worker_by_phone`.
