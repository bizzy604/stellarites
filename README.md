# PRODUCT REQUIREMENTS DOCUMENT (PRD)
## KaziChain: Verified Work History Platform for Domestic Workers

**Version:** 1.0  
**Date:** January 22, 2026  
**Project Duration:** 48 hours (Hackathon MVP)  
**Tech Stack:** React (Frontend) + Python/FastAPI (Backend) + PostgreSQL + Stellar

**Implementation status:** Backend (USSD, Africa's Talking, Stellar wallet mapping on signup) and setup are documented in [`Backend/README.md`](Backend/README.md). Architecture and data flow are in [`Backend/docs/architecture.md`](Backend/docs/architecture.md).

---

## EXECUTIVE SUMMARY

KaziChain is a Progressive Web Application (PWA) that creates portable, verifiable work histories for domestic workers in Kenya, anchored on Stellar blockchain for immutability. The platform addresses trust asymmetry between employers and workers by providing cryptographically verifiable employment records, payment documentation, and reputation scoring.

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