# PRODUCT REQUIREMENTS DOCUMENT (PRD)
## NannyChain: Verified Work History Platform for Domestic Workers

**Version:** 1.0  
**Date:** January 22, 2026  
**Project Duration:** 48 hours (Hackathon MVP)  
**Tech Stack:** React (Frontend) + Python/Flask (Backend) + PostgreSQL + Stellar

---

## EXECUTIVE SUMMARY

NannyChain is a Progressive Web Application (PWA) that creates portable, verifiable work histories for domestic workers in Kenya, anchored on Stellar blockchain for immutability. The platform addresses trust asymmetry between employers and workers by providing cryptographically verifiable employment records, payment documentation, and reputation scoring.

**Core Value Proposition:**
- **For Workers:** Portable professional credentials, verified payment history, career dignity
- **For Employers:** Trustworthy worker verification, reduced hiring risk, transparent references
- **For Ecosystem:** Formalization without legal burden, data-driven labor market insights

---

## 1. PRODUCT OVERVIEW

### 1.1 Problem Statement

**Primary Problems:**
1. **Trust Vacuum:** No standardized worker verification mechanism
2. **Reputation Loss:** Workers cannot prove experience when changing employers
3. **Payment Opacity:** No documentation of wages, making disputes difficult
4. **Social Stigma:** Domestic work viewed as temporary, not professional career
5. **Information Asymmetry:** Employers hire blind; workers have no leverage

**Market Context:**
- 2M+ domestic workers in Kenya
- 85-90% informal arrangements
- Legal minimum wage: 14,000 KES (rarely enforced)
- Actual wage range: 8,000-25,000 KES
- High turnover, zero formal documentation

### 1.2 Solution Overview

**Three-Pillar Architecture:**

1. **Verified Identity Registry**
   - Self-sovereign worker profiles
   - Stellar-anchored identity proof
   - QR code-based verification

2. **Payment Documentation System**
   - Worker-initiated logging with employer confirmation
   - SMS-based verification workflow
   - Blockchain audit trail

3. **Reputation Engine**
   - Multi-dimensional rating system
   - Cryptographically signed reviews
   - Portable across employers

### 1.3 Success Metrics (Hackathon)

**Technical Success:**
- [ ] Complete user registration flow (< 3 minutes)
- [ ] QR code generation and verification working
- [ ] At least 1 successful Stellar transaction recorded
- [ ] PWA installable on mobile device
- [ ] Offline functionality operational

**Demo Success:**
- [ ] Live demonstration of full worker journey
- [ ] Real-time QR scanning verification
- [ ] Stellar transaction visible in explorer
- [ ] Judges can interact with deployed app

**Business Validation:**
- [ ] 10+ demo worker profiles created
- [ ] Clear adoption pathway articulated
- [ ] Partnership strategy outlined
- [ ] Revenue model defined

---

## 2. USER PERSONAS

### 2.1 Primary Persona: Jane Wanjiku (Domestic Worker)

**Demographics:**
- Age: 28
- Location: Kawangware, Nairobi
- Education: Secondary school incomplete
- Experience: 4 years childcare
- Device: Samsung A04 (entry-level smartphone)
- Income: 16,000 KES/month

**Pain Points:**
- Has worked for 3 families, no documented proof
- Relies on verbal references (previous employers don't always answer calls)
- Lost job opportunity because couldn't prove experience
- Wants professional recognition but feels stigmatized

**Goals:**
- Build verifiable work history
- Get higher-paying jobs
- Have proof of reliability
- Professional identity

**Technical Context:**
- Uses WhatsApp daily
- Uses M-Pesa for all payments
- Limited data budget (~1GB/month)
- Comfortable with smartphone basics, cautious with new apps

### 2.2 Secondary Persona: Sarah Muthoni (Employer)

**Demographics:**
- Age: 34
- Location: Kilimani, Nairobi
- Occupation: Marketing manager
- Children: 2 (ages 3 and 5)
- Device: iPhone 13

**Pain Points:**
- Hired 3 nannies in 2 years (reliability issues)
- Difficult to verify references
- Worried about child safety
- Wants trustworthy, experienced caregiver

**Goals:**
- Verify worker experience quickly
- Access to reliable references
- Peace of mind
- Fair wage benchmarking

**Technical Context:**
- Heavy smartphone user
- Comfortable with apps
- Values convenience
- Security-conscious

---

## 3. FUNCTIONAL REQUIREMENTS

### 3.1 Core Features (MVP - Must Have)

#### **Feature 1: Worker Registration**

**User Story:**  
As a domestic worker, I want to create a verified profile so that I can prove my experience to potential employers.

**Acceptance Criteria:**
- [ ] Form validation: name (required), phone (required, Kenyan format)
- [ ] Phone verification via SMS OTP (6-digit code)
- [ ] Profile photo upload (max 2MB, JPG/PNG)
- [ ] Skills selection (multi-select: Childcare, Cooking, Cleaning, Elderly Care)
- [ ] Experience level (dropdown: <1yr, 1-3yr, 3-5yr, 5+yr)
- [ ] Location (auto-detect or manual entry)
- [ ] Generate unique Worker ID (format: NW-XXXX, alphanumeric)
- [ ] Create Stellar keypair (stored encrypted)
- [ ] Anchor profile hash to Stellar blockchain
- [ ] Generate QR code containing: `{workerId, profileHash, stellarTxId}`
- [ ] Display confirmation screen with downloadable QR card
- [ ] Send SMS confirmation with Worker ID

nannychain/
│
├── README.md
├── .gitignore
├── docker-compose.yml                 # Local development setup
├── DEPLOYMENT.md                      # Deployment guide
└── ARCHITECTURE.md                    # System architecture docs
│
├── frontend/                          # React PWA
│   ├── public/
│   │   ├── index.html
│   │   ├── manifest.json
│   │   ├── robots.txt
│   │   ├── service-worker.js
│   │   ├── favicon.ico
│   │   └── icons/
│   │       ├── icon-72x72.png
│   │       ├── icon-96x96.png
│   │       ├── icon-128x128.png
│   │       ├── icon-144x144.png
│   │       ├── icon-152x152.png
│   │       ├── icon-192x192.png
│   │       ├── icon-384x384.png
│   │       └── icon-512x512.png
│   │
│   ├── src/
│   │   ├── main.jsx                   # App entry point
│   │   ├── App.jsx                    # Root component
│   │   ├── index.css                  # Global styles (Tailwind)
│   │   │
│   │   ├── assets/
│   │   │   ├── images/
│   │   │   │   ├── logo.svg
│   │   │   │   ├── hero-bg.jpg
│   │   │   │   └── placeholder-avatar.png
│   │   │   └── icons/
│   │   │       ├── stellar.svg
│   │   │       └── verified-badge.svg
│   │   │
│   │   ├── components/
│   │   │   ├── common/
│   │   │   │   ├── Button.jsx
│   │   │   │   ├── Input.jsx
│   │   │   │   ├── Textarea.jsx
│   │   │   │   ├── Select.jsx
│   │   │   │   ├── Checkbox.jsx
│   │   │   │   ├── Modal.jsx
│   │   │   │   ├── Toast.jsx
│   │   │   │   ├── LoadingSpinner.jsx
│   │   │   │   ├── LoadingSkeleton.jsx
│   │   │   │   ├── ErrorBoundary.jsx
│   │   │   │   ├── Card.jsx
│   │   │   │   ├── Badge.jsx
│   │   │   │   ├── Avatar.jsx
│   │   │   │   ├── Tabs.jsx
│   │   │   │   ├── Accordion.jsx
│   │   │   │   ├── ProgressBar.jsx
│   │   │   │   └── StepIndicator.jsx
│   │   │   │
│   │   │   ├── layout/
│   │   │   │   ├── Header.jsx
│   │   │   │   ├── Footer.jsx
│   │   │   │   ├── Sidebar.jsx
│   │   │   │   ├── Navigation.jsx
│   │   │   │   ├── MobileNav.jsx
│   │   │   │   ├── Container.jsx
│   │   │   │   └── PageLayout.jsx
│   │   │   │
│   │   │   ├── auth/
│   │   │   │   ├── WalletConnectButton.jsx
│   │   │   │   ├── WalletModal.jsx
│   │   │   │   ├── AuthGuard.jsx
│   │   │   │   ├── RoleGuard.jsx
│   │   │   │   └── LogoutButton.jsx
│   │   │   │
│   │   │   ├── worker/
│   │   │   │   ├── registration/
│   │   │   │   │   ├── RegistrationWizard.jsx
│   │   │   │   │   ├── PersonalInfoStep.jsx
│   │   │   │   │   ├── SkillsStep.jsx
│   │   │   │   │   ├── PhotoUploadStep.jsx
│   │   │   │   │   ├── PhoneVerificationStep.jsx
│   │   │   │   │   └── ConfirmationStep.jsx
│   │   │   │   │
│   │   │   │   ├── profile/
│   │   │   │   │   ├── ProfileCard.jsx
│   │   │   │   │   ├── ProfileHeader.jsx
│   │   │   │   │   ├── ProfileEditor.jsx
│   │   │   │   │   ├── SkillsBadges.jsx
│   │   │   │   │   ├── ExperienceBadge.jsx
│   │   │   │   │   └── QRCodeDisplay.jsx
│   │   │   │   │
│   │   │   │   ├── reputation/
│   │   │   │   │   ├── ReputationScore.jsx
│   │   │   │   │   ├── ReputationChart.jsx
│   │   │   │   │   ├── RatingStars.jsx
│   │   │   │   │   ├── RatingBreakdown.jsx
│   │   │   │   │   └── VerificationBadge.jsx
│   │   │   │   │
│   │   │   │   ├── work-history/
│   │   │   │   │   ├── WorkHistoryTimeline.jsx
│   │   │   │   │   ├── EmploymentCard.jsx
│   │   │   │   │   ├── EmploymentDetails.jsx
│   │   │   │   │   └── EmploymentStats.jsx
│   │   │   │   │
│   │   │   │   ├── payments/
│   │   │   │   │   ├── PaymentHistory.jsx
│   │   │   │   │   ├── PaymentCard.jsx
│   │   │   │   │   ├── PaymentDetails.jsx
│   │   │   │   │   ├── PaymentStats.jsx
│   │   │   │   │   ├── PaymentChart.jsx
│   │   │   │   │   └── StellarPaymentLink.jsx
│   │   │   │   │
│   │   │   │   └── reviews/
│   │   │   │       ├── ReviewsList.jsx
│   │   │   │       ├── ReviewCard.jsx
│   │   │   │       ├── ReviewStats.jsx
│   │   │   │       └── ReviewResponse.jsx
│   │   │   │
│   │   │   ├── employer/
│   │   │   │   ├── verification/
│   │   │   │   │   ├── QRScanner.jsx
│   │   │   │   │   ├── QRScannerModal.jsx
│   │   │   │   │   ├── ManualIDInput.jsx
│   │   │   │   │   └── VerificationResult.jsx
│   │   │   │   │
│   │   │   │   ├── hiring/
│   │   │   │   │   ├── HireWorkerModal.jsx
│   │   │   │   │   ├── EmploymentForm.jsx
│   │   │   │   │   ├── ContractTerms.jsx
│   │   │   │   │   └── EmploymentConfirmation.jsx
│   │   │   │   │
│   │   │   │   ├── payments/
│   │   │   │   │   ├── PaymentSender.jsx
│   │   │   │   │   ├── PaymentForm.jsx
│   │   │   │   │   ├── PaymentConfirmation.jsx
│   │   │   │   │   └── PaymentReceipt.jsx
│   │   │   │   │
│   │   │   │   ├── reviews/
│   │   │   │   │   ├── ReviewForm.jsx
│   │   │   │   │   ├── RatingInput.jsx
│   │   │   │   │   ├── FeedbackTextarea.jsx
│   │   │   │   │   └── ReviewSubmission.jsx
│   │   │   │   │
│   │   │   │   └── management/
│   │   │   │       ├── MyWorkersList.jsx
│   │   │   │       ├── WorkerCard.jsx
│   │   │   │       ├── ActiveEmployments.jsx
│   │   │   │       └── EndEmploymentModal.jsx
│   │   │   │
│   │   │   ├── blockchain/
│   │   │   │   ├── StellarAccountDisplay.jsx
│   │   │   │   ├── TransactionStatus.jsx
│   │   │   │   ├── TransactionHistory.jsx
│   │   │   │   ├── BlockchainExplorerLink.jsx
│   │   │   │   ├── SmartContractInfo.jsx
│   │   │   │   └── NetworkIndicator.jsx
│   │   │   │
│   │   │   ├── ipfs/
│   │   │   │   ├── IPFSUploader.jsx
│   │   │   │   ├── IPFSImageViewer.jsx
│   │   │   │   └── IPFSStatus.jsx
│   │   │   │
│   │   │   └── notifications/
│   │   │       ├── NotificationCenter.jsx
│   │   │       ├── NotificationItem.jsx
│   │   │       └── NotificationBadge.jsx
│   │   │
│   │   ├── pages/
│   │   │   ├── public/
│   │   │   │   ├── HomePage.jsx
│   │   │   │   ├── AboutPage.jsx
│   │   │   │   ├── HowItWorksPage.jsx
│   │   │   │   ├── FAQPage.jsx
│   │   │   │   ├── ContactPage.jsx
│   │   │   │   ├── PrivacyPage.jsx
│   │   │   │   ├── TermsPage.jsx
│   │   │   │   └── NotFoundPage.jsx
│   │   │   │
│   │   │   ├── auth/
│   │   │   │   ├── LoginPage.jsx
│   │   │   │   ├── RoleSelectionPage.jsx
│   │   │   │   └── OnboardingPage.jsx
│   │   │   │
│   │   │   ├── worker/
│   │   │   │   ├── RegisterPage.jsx
│   │   │   │   ├── DashboardPage.jsx
│   │   │   │   ├── ProfilePage.jsx
│   │   │   │   ├── EditProfilePage.jsx
│   │   │   │   ├── PaymentsPage.jsx
│   │   │   │   ├── WorkHistoryPage.jsx
│   │   │   │   ├── ReviewsPage.jsx
│   │   │   │   ├── SettingsPage.jsx
│   │   │   │   └── QRCodePage.jsx
│   │   │   │
│   │   │   ├── employer/
│   │   │   │   ├── DashboardPage.jsx
│   │   │   │   ├── VerifyWorkerPage.jsx
│   │   │   │   ├── MyWorkersPage.jsx
│   │   │   │   ├── WorkerDetailPage.jsx
│   │   │   │   ├── SendPaymentPage.jsx
│   │   │   │   ├── LeaveReviewPage.jsx
│   │   │   │   └── SettingsPage.jsx
│   │   │   │
│   │   │   └── shared/
│   │   │       ├── ProfileViewPage.jsx
│   │   │       ├── TransactionDetailPage.jsx
│   │   │       └── HelpPage.jsx
│   │   │
│   │   ├── hooks/
│   │   │   ├── useAuth.js
│   │   │   ├── useStellarAuth.js
│   │   │   ├── useWallet.js
│   │   │   ├── useWorkerProfile.js
│   │   │   ├── useEmployerProfile.js
│   │   │   ├── useReputation.js
│   │   │   ├── useWorkHistory.js
│   │   │   ├── usePayments.js
│   │   │   ├── useReviews.js
│   │   │   ├── useSmartContract.js
│   │   │   ├── useQRScanner.js
│   │   │   ├── useIPFS.js
│   │   │   ├── useToast.js
│   │   │   ├── useLocalStorage.js
│   │   │   ├── useSessionStorage.js
│   │   │   ├── useOfflineSync.js
│   │   │   ├── useNetworkStatus.js
│   │   │   ├── useMediaQuery.js
│   │   │   └── useDebounce.js
│   │   │
│   │   ├── context/
│   │   │   ├── AuthContext.jsx
│   │   │   ├── WalletContext.jsx
│   │   │   ├── WorkerContext.jsx
│   │   │   ├── EmployerContext.jsx
│   │   │   ├── ToastContext.jsx
│   │   │   └── ThemeContext.jsx
│   │   │
│   │   ├── services/
│   │   │   ├── api/
│   │   │   │   ├── axios.js               # Axios instance
│   │   │   │   ├── interceptors.js
│   │   │   │   ├── authApi.js
│   │   │   │   ├── workerApi.js
│   │   │   │   ├── employerApi.js
│   │   │   │   ├── paymentApi.js
│   │   │   │   └── reviewApi.js
│   │   │   │
│   │   │   ├── stellar/
│   │   │   │   ├── stellarService.js
│   │   │   │   ├── walletService.js
│   │   │   │   ├── accountService.js
│   │   │   │   ├── transactionService.js
│   │   │   │   ├── paymentService.js
│   │   │   │   └── horizonService.js
│   │   │   │
│   │   │   ├── soroban/
│   │   │   │   ├── sorobanService.js
│   │   │   │   ├── contractService.js
│   │   │   │   ├── employmentContract.js
│   │   │   │   ├── paymentContract.js
│   │   │   │   └── reputationContract.js
│   │   │   │
│   │   │   ├── ipfs/
│   │   │   │   ├── ipfsService.js
│   │   │   │   ├── uploadService.js
│   │   │   │   └── encryptionService.js
│   │   │   │
│   │   │   ├── auth/
│   │   │   │   ├── sep10Service.js
│   │   │   │   ├── authService.js
│   │   │   │   └── sessionService.js
│   │   │   │
│   │   │   └── utils/
│   │   │       ├── qrCodeService.js
│   │   │       ├── notificationService.js
│   │   │       └── analyticsService.js
│   │   │
│   │   ├── utils/
│   │   │   ├── constants.js
│   │   │   ├── config.js
│   │   │   ├── validators.js
│   │   │   ├── formatters.js
│   │   │   ├── dateUtils.js
│   │   │   ├── currencyUtils.js
│   │   │   ├── stringUtils.js
│   │   │   ├── arrayUtils.js
│   │   │   ├── stellarUtils.js
│   │   │   ├── errorHandler.js
│   │   │   └── logger.js
│   │   │
│   │   ├── lib/
│   │   │   ├── stellar-sdk.js          # Stellar SDK initialization
│   │   │   ├── wallet-kit.js           # Wallet Kit setup
│   │   │   └── qr-scanner.js           # QR scanner library
│   │   │
│   │   ├── styles/
│   │   │   ├── globals.css
│   │   │   ├── components.css
│   │   │   └── utilities.css
│   │   │
│   │   └── types/                      # TypeScript types (if using TS)
│   │       ├── stellar.d.ts
│   │       ├── worker.d.ts
│   │       ├── employer.d.ts
│   │       ├── payment.d.ts
│   │       └── review.d.ts
│   │
│   ├── tests/
│   │   ├── unit/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   └── utils/
│   │   │
│   │   ├── integration/
│   │   │   ├── auth.test.js
│   │   │   ├── registration.test.js
│   │   │   ├── payment.test.js
│   │   │   └── review.test.js
│   │   │
│   │   └── e2e/
│   │       ├── worker-journey.test.js
│   │       └── employer-journey.test.js
│   │
│   ├── .env.example
│   ├── .env.development
│   ├── .env.production
│   ├── .gitignore
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── vitest.config.js
│   ├── eslint.config.js
│   └── README.md
│
├── backend/                           # Python/Flask API
│   ├── app/
│   │   ├── __init__.py
│   │   ├── config.py
│   │   ├── database.py
│   │   │
│   │   ├── models/                    # Minimal DB models (cache only)
│   │   │   ├── __init__.py
│   │   │   ├── worker_index.py        # phone_hash → stellar_public_key
│   │   │   ├── employer_index.py
│   │   │   ├── sep10_challenge.py     # SEP-10 challenge cache
│   │   │   ├── sms_log.py
│   │   │   └── analytics.py
│   │   │
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py                # SEP-10 endpoints
│   │   │   ├── workers.py             # Worker profile queries
│   │   │   ├── employers.py           # Employer endpoints
│   │   │   ├── payments.py            # Payment history queries
│   │   │   ├── reviews.py             # Review queries
│   │   │   ├── stellar.py             # Stellar utilities
│   │   │   ├── soroban.py             # Smart contract interactions
│   │   │   └── health.py              # Health check
│   │   │
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── stellar/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── stellar_service.py
│   │   │   │   ├── account_service.py
│   │   │   │   ├── transaction_service.py
│   │   │   │   ├── payment_service.py
│   │   │   │   └── horizon_service.py
│   │   │   │
│   │   │   ├── soroban/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── soroban_service.py
│   │   │   │   ├── contract_deployer.py
│   │   │   │   ├── employment_contract.py
│   │   │   │   ├── payment_contract.py
│   │   │   │   ├── review_contract.py
│   │   │   │   └── reputation_contract.py
│   │   │   │
│   │   │   ├── auth/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── sep10_service.py
│   │   │   │   ├── jwt_service.py
│   │   │   │   └── session_service.py
│   │   │   │
│   │   │   ├── ipfs/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── ipfs_service.py
│   │   │   │   ├── pinata_service.py
│   │   │   │   └── encryption_service.py
│   │   │   │
│   │   │   ├── sms/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── sms_service.py
│   │   │   │   ├── africastalking_service.py
│   │   │   │   └── template_service.py
│   │   │   │
│   │   │   ├── indexer/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── horizon_indexer.py
│   │   │   │   ├── payment_indexer.py
│   │   │   │   ├── event_indexer.py
│   │   │   │   └── notification_service.py
│   │   │   │
│   │   │   └── cache/
│   │   │       ├── __init__.py
│   │   │       ├── redis_service.py
│   │   │       └── cache_manager.py
│   │   │
│   │   ├── middleware/
│   │   │   ├── __init__.py
│   │   │   ├── auth_middleware.py
│   │   │   ├── rate_limiter.py
│   │   │   ├── cors_middleware.py
│   │   │   ├── error_handler.py
│   │   │   └── request_logger.py
│   │   │
│   │   ├── utils/
│   │   │   ├── __init__.py
│   │   │   ├── validators.py
│   │   │   ├── formatters.py
│   │   │   ├── stellar_helpers.py
│   │   │   ├── encryption_helpers.py
│   │   │   ├── id_generator.py
│   │   │   ├── exceptions.py
│   │   │   ├── logger.py
│   │   │   └── constants.py
│   │   │
│   │   └── schemas/                   # Pydantic schemas
│   │       ├── __init__.py
│   │       ├── worker_schema.py
│   │       ├── employer_schema.py
│   │       ├── payment_schema.py
│   │       ├── review_schema.py
│   │       └── auth_schema.py
│   │
│   ├── migrations/                    # Alembic migrations
│   │   ├── versions/
│   │   ├── env.py
│   │   ├── script.py.mako
│   │   └── README
│   │
│   ├── indexer/                       # Background jobs
│   │   ├── __init__.py
│   │   ├── horizon_listener.py
│   │   ├── payment_processor.py
│   │   ├── event_processor.py
│   │   └── notification_worker.py
│   │
│   ├── scripts/
│   │   ├── seed_db.py
│   │   ├── deploy_contract.py
│   │   ├── fund_accounts.py
│   │   ├── generate_test_data.py
│   │   └── backup_db.py
│   │
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── conftest.py
│   │   ├── unit/
│   │   │   ├── test_stellar_service.py
│   │   │   ├── test_soroban_service.py
│   │   │   ├── test_sep10_service.py
│   │   │   ├── test_ipfs_service.py
│   │   │   └── test_sms_service.py
│   │   │
│   │   ├── integration/
│   │   │   ├── test_auth_flow.py
│   │   │   ├── test_worker_registration.py
│   │   │   ├── test_payment_flow.py
│   │   │   └── test_review_flow.py
│   │   │
│   │   └── e2e/
│   │       ├── test_complete_journey.py
│   │       └── test_smart_contracts.py
│   │
│   ├── .env.example
│   ├── .env.development
│   ├── .env.production
│   ├── .gitignore
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   ├── pyproject.toml
│   ├── pytest.ini
│   ├── alembic.ini
│   ├── Procfile                       # For deployment
│   ├── gunicorn.conf.py
│   ├── run.py
│   └── README.md
│
├── contracts/                         # Soroban smart contracts
│   ├── work_records/
│   │   ├── src/
│   │   │   ├── lib.rs                 # Main contract
│   │   │   ├── employment.rs
│   │   │   ├── payment.rs
│   │   │   ├── review.rs
│   │   │   ├── reputation.rs
│   │   │   ├── types.rs
│   │   │   ├── errors.rs
│   │   │   ├── events.rs
│   │   │   ├── storage.rs
│   │   │   └── utils.rs
│   │   │
│   │   ├── tests/
│   │   │   ├── integration.rs
│   │   │   └── unit.rs
│   │   │
│   │   ├── Cargo.toml
│   │   └── README.md
│   │
│   ├── scripts/
│   │   ├── build.sh
│   │   ├── deploy.sh
│   │   ├── test.sh
│   │   └── optimize.sh
│   │
│   └── deployed_contracts.json        # Contract addresses
│
├── docs/                              # Documentation
│   ├── ARCHITECTURE.md
│   ├── API_REFERENCE.md
│   ├── SMART_CONTRACTS.md
│   ├── DEPLOYMENT_GUIDE.md
│   ├── USER_GUIDE.md
│   ├── DEVELOPER_GUIDE.md
│   ├── STELLAR_INTEGRATION.md
│   ├── SOROBAN_GUIDE.md
│   ├── IPFS_GUIDE.md
│   ├── SECURITY.md
│   ├── PRIVACY.md
│   └── diagrams/
│       ├── system-architecture.png
│       ├── user-flows.png
│       ├── smart-contract-flow.png
│       └── payment-flow.png
│
├── scripts/                           # DevOps scripts
│   ├── setup-dev.sh
│   ├── setup-prod.sh
│   ├── deploy-frontend.sh
│   ├── deploy-backend.sh
│   ├── deploy-contracts.sh
│   ├── backup.sh
│   ├── restore.sh
│   └── monitor.sh
│
├── infra/                             # Infrastructure as Code
│   ├── docker/
│   │   ├── frontend.Dockerfile
│   │   ├── backend.Dockerfile
│   │   ├── indexer.Dockerfile
│   │   └── nginx.Dockerfile
│   │
│   ├── kubernetes/                    # K8s manifests (if needed)
│   │   ├── frontend-deployment.yaml
│   │   ├── backend-deployment.yaml
│   │   ├── indexer-deployment.yaml
│   │   ├── redis-deployment.yaml
│   │   └── postgres-deployment.yaml
│   │
│   └── terraform/                     # Cloud infrastructure
│       ├── main.tf
│       ├── variables.tf
│       └── outputs.tf
│
├── .github/                           # GitHub Actions
│   └── workflows/
│       ├── frontend-ci.yml
│       ├── backend-ci.yml
│       ├── contracts-ci.yml
│       ├── deploy-staging.yml
│       └── deploy-production.yml
│
├── postman/                           # API testing
│   ├── nannychain-collection.json
│   └── nannychain-environment.json
│
└── pitch/                             # Hackathon materials
    ├── pitch-deck.pdf
    ├── demo-video.mp4
    ├── one-pager.pdf
    ├── screenshots/
    └── user-interviews.pdf