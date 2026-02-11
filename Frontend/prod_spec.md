# Paytrace: Product & Design Specification

## 1. Core Identity & Rules
**Concept:** A "Stellar-Powered, M-Pesa-Simple" payroll and identity system.
**Golden Rule:** If a user needs to Google a word (e.g., "Blockchain", "Slippage", "Decentralized"), the UI has failed. Use everyday financial language.

---

## 2. Visual Identity (The Design System)

### 🎨 Color Palette
| Usage | Hex Code | Purpose |
| :--- | :--- | :--- |
| **Primary** | `#ADD8E6` | "Stellar Light Blue" - Action buttons, links, success icons. |
| **Secondary** | `#000000` | Deep Black - Sidebar, primary text, headers. |
| **Neutral** | `#FFFFFF` | Backgrounds, cards, input fields. |
| **Warning** | `#FF4D4D` | Red - Error messages, "Delete" actions, failed transactions. |
| **Gray** | `#F4F4F4` | Light Gray - Secondary backgrounds and borders. |

### 🔡 Typography & Sizes
* **Font Family:** `Inter`, `Roboto`, or `San Francisco` (Clean Sans-Serif).
* **H1 (Headers):** `24px / Bold` - Used for page titles (e.g., "Your Balance").
* **H2 (Sub-headers):** `18px / Semi-Bold` - Used for section titles.
* **Body Copy:** `16px / Regular` - Optimized for readability on mobile screens.
* **Small Text:** `12px / Regular` - Used for "Service Charges" or timestamps.

---

## 3. UI Interaction Rules

### A. The "Success & Error" Protocol
All blockchain operations must be accompanied by a visual feedback "Toast" or "Modal":
* **Success Rule:** Every successful Stellar transaction must show a green checkmark and a "View Receipt" button. 
* **Error Rule:** If a transaction fails (e.g., network error), show a "Retry" button. *Never* show the raw error code from the blockchain.
* **Loading Rule:** While "Waiting for Ledger," show a pulsing Light Blue circle with the text: *"Finalizing Secure Payment..."*

### B. Input Field Rules
* **Buttons:** Minimum height of `48px` to ensure they are easy to tap for users on the go.
* **Radius:** All buttons and cards must have a border-radius of `8px`.
* **Currency:** All amounts must lead with **KES**. If showing XLM or Stablecoins, they should be in small gray text underneath.

---

## 4. User-Specific Dashboards

### User A: Employer (The Payer)
* **Home Screen:** Must show "Total Monthly Payroll" at a glance.
* **Worker List:** Each worker card must show their **Verification Status** (Green Badge).
* **Action:** "Send Salary" triggers a confirmation modal showing: *Name, Amount, Service Charge (0.01 KES), and Total.*

### User B: Worker (The Manager)
* **Home Screen:** Must show "Current Balance" in large, bold text.
* **Identity Card:** A persistent "View My QR ID" button at the bottom of the screen.
* **Withdrawal:** A simple "One-Tap" M-Pesa withdrawal interface.

---

## 5. Abstraction Rules (The "Blockchain Hidden" Layer)
1.  **Key Management:** Keys are generated automatically in the background. The user logs in with **Phone Number + PIN**.
2.  **Terminology:** * ❌ Do not use: "Public Key," "Seed Phrase," "Transaction Hash."
    * ✅ Use: "Worker ID," "Recovery Code," "Receipt ID."
3.  **The "Stellar" Footprint:** Place a small, elegant "Secured by Stellar" or "Verified on Blockchain" badge at the bottom of receipts to build "Invisible Trust."

---

## 6. Functional Requirements (MVP Focus)
- [ ] **Worker Registration:** Form with Skills, Experience, and Location.
- [ ] **QR Generation:** Auto-create unique ID (NW-XXXX) + Profile QR.
- [ ] **Payment Flow:** Employer funds -> Stellar Network -> Worker Wallet.
- [ ] **M-Pesa Exit:** Integrated M-Pesa withdrawal button.