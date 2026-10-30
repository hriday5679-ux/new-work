# AICTE FDR360 (SIH26265) Enterprise Hardening & Auth Plan

Enterprise security deposit and Fixed Deposit Receipt (FDR) lifecycle management portal for AICTE, delivering production-grade Firebase Authentication, Firestore-backed real identity and RBAC, 21-institution canonical filtering, multi-tiered clearance matrix, and hermetically isolated Demo Mode.

### User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural decisions were confirmed:
> - **Real-User Data Flow**: Direct client Firestore SDK with strict security rules (`firestore.rules` and `storage.rules`). Express backend serves the SPA and dev middleware; Demo Mode runs entirely isolated in-memory.
> - **Initial Administrator Account**: The authenticated email `workhack1111@gmail.com` is automatically bootstrapped with role `ADMINISTRATOR` and `APPROVED` status upon profile creation in Firestore, enabling instant access to the Access Requests panel without manual console tinkering.

---

## 1. Overview & Core Concept

AICTE FDR360 manages the statutory lifecycle of security deposits and FDRs submitted by approved technical institutions and universities across India under the AICTE Approval Process Handbook (APH).

```
                      ┌──────────────────────────────────────┐
                      │    AICTE FDR360 Gateway / Portal     │
                      └──────────────────┬───────────────────┘
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 ▼                                               ▼
     ┌───────────────────────┐                       ┌───────────────────────┐
     │  Real Firebase Auth   │                       │   Isolated Demo Mode  │
     │  (Email/Pass + Google)│                       │   (In-Memory / Stubs) │
     └───────────┬───────────┘                       └───────────┬───────────┘
                 │                                               │
                 ▼                                               ▼
     ┌───────────────────────┐                       ┌───────────────────────┐
     │   Firestore (users/   │                       │  Simulated Rajiv/MAIT │
     │  {uid}, fdrs, audit)  │                       │  & Mock 21 Institutes │
     └───────────┬───────────┘                       └───────────────────────┘
                 │
   ┌─────────────┴─────────────┐
   ▼                           ▼
┌──────────────────┐   ┌──────────────────┐
│ Institution Flow │   │  AICTE Officer   │
│ (Maker/Signatory)│   │  (RO/PGRC/Vig/   │
│ - Scrutiny Docs  │   │   Admin Approval)│
│ - Release NOC    │   │ - Clearance Tiers│
└──────────────────┘   └──────────────────┘
```

---

## 2. User Experience & Visual Design

- **Visual Direction**: Authoritative government enterprise portal adhering to the Universal Frontend Design Constitution. Deep navy blue (`#07162b`), crisp slate structural backgrounds (`#0F172A` / `#F8FAFC`), and subtle amber/gold accents (`#D97706` / `#F59E0B`).
- **Typography**: Clean corporate hierarchy with `Inter` and `JetBrains Mono` for tabular FDR amounts and reference codes (`tabular-nums`).
- **Zero-Pill Discipline & Restraint**: Unboxed metadata text separated by middle dots (`·`), no fake compiler tags or ornamental pulse dots.
- **Key Flows**:
  1. **Unauthenticated Public Landing / Auth**: High-trust government portal landing with quick statistics, login form with Email/Password and Google OAuth, password reset modal, registration page, and a clear high-visibility "Try Demo Mode (Simulated Data)" badge.
  2. **First-Time User Onboarding**: 2-step full-screen wizard capturing Institution vs AICTE affiliation, designation, canonical institution selection from the 21 preloaded entities, employee ID, and contact details.
  3. **Access Gatekeeper**: Real users start with `PENDING` status. Pending AICTE users view a dedicated waiting screen; institutions can manage draft submissions; administrators see immediate pending request badges with one-click approval/rejection.

---

## 3. Staged Implementation Roadmap

### Stage 0: Stabilisation & Baseline Health
- Run build and lint verification.
- Verify `firebase-applet-config.json` and ensure `.env.example` includes `GEMINI_API_KEY` and all Firebase keys.
- Remove unwanted artifacts (e.g., leftover `bun.lock`).

### Stage 1: Robust Authentication
- Email & password signup, login, password recovery (`sendPasswordResetEmail`), and signout (`auth.signOut()`).
- Google Sign-In with `signInWithPopup`, graceful fallback handling for iframe constraints, and readable human error messages (`auth/popup-blocked`, `auth/unauthorized-domain`, etc.).
- Clear "Exit Demo Mode" button in the top bar when running demo mode.

### Stage 2: Real Identity & Firestore Unification
- Bind Header, Sidebar, Dashboard greetings, and active context directly to Firestore `users/{uid}`.
- Remove hardcoded "Dr. Rajiv K. Sharma" from production views (relegating it strictly to Demo Mode).
- Unify data fetching: Real accounts query client Firestore; Demo accounts use in-memory seeds.

### Stage 3: Step-by-Step Onboarding Modal
- Step 1: Sector selection ("Where do you belong?": Educational Institution vs AICTE Headquarters/RO).
- Step 2: Designation selection (Director, Principal, Chairman, Registrar, etc. for Institutions; Regional Officer, Checker, PGRC, Vigilance, Administrator for AICTE) + searchable 21 canonical institutions.

### Stage 4: Enterprise RBAC & Security Rules
- Auto-promote `workhack1111@gmail.com` to `ADMINISTRATOR` on first profile sync.
- Pending AICTE users see the `PendingApprovalView` screen until approved.
- Admin `AccessRequestsPage` with Approve, Reject, and Role Reassignment actions.
- Hardened `firestore.rules` and `storage.rules` preventing self-escalation and enforcing append-only audit logs.

### Stage 5: Canonical Institution Directory & Universal Filters
- 21 canonical institutions catalogued with clear category labels and verification status badges.
- Global Institution selector for AICTE roles across Dashboard, FDR List, Document Vault, Releases, and Reports.

### Stage 6: Document Uploads & Storage Integration
- Real document upload flow to Firebase Storage with progress tracking, 10MB limits, and fallback mock OCR clearly labeled as simulated.
