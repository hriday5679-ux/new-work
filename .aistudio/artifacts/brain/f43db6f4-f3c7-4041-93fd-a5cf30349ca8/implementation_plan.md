# Implementation Plan: AICTE FDR360 Real Authentication, Data Isolation & Firebase Integration

Transform AICTE FDR360 from persona-only demo switcher into a real, production-ready portal with Firebase Authentication (Email/Password & Google Sign-In), Firestore per-institution data isolation, real file uploads via Firebase Storage, and isolated Demo Mode for SIH judges.

---

## 1. Architecture & Security Strategy

### A. Authentication & User Profiles
- **Providers**: Firebase Authentication with Email/Password and Google OAuth (`GoogleAuthProvider`).
- **Session Lifecycle**: `onAuthStateChanged` persistence across reloads, real `signOut()` clearing all session states.
- **Iframe Resilience**: `signInWithPopup` with fallback to `signInWithRedirect` and visual notification for preview iframe constraints.
- **Role Assignment**: All self-registered users are strictly given `role: "INSTITUTION"`. Only designated Administrators can grant officer roles (`REGIONAL_OFFICER`, `PGRC_OFFICER`, `VIGILANCE_OFFICER`, `ADMINISTRATOR`).
- **User Document**: On first registration, persist `users/{uid}` in Firestore with `{ name, email, role: 'INSTITUTION', institutionId, institutionName, designation, phone, createdAt, onboardingComplete: true }`.

### B. Public vs Protected Routes
- **Visitors / Unauthenticated**:
  - Professional public AICTE FDR360 Landing Page introducing the portal and compliance requirements.
  - Dedicated full-screen **Sign In Page** (`/login` state) with Email/Password, "Continue with Google", Forgot Password modal, and "Try Demo Mode" button.
  - Dedicated full-screen **Sign Up Page** (`/register` state) with name, email, password confirmation, canonical institution selector (with "My institution is not listed" option), designation, and phone.
- **Authenticated Users**: Access only their own institution's profile, FDRs, documents, and release requests.
- **Demo Mode**: Explicitly separated sandbox mode using benchmark reference records, with a persistent top banner and "Exit Demo Mode" button returning to public login.

### C. Data Isolation & Real Persistence
- **Firestore Collections**:
  - `users/{uid}`: Profile and assigned institution ID.
  - `institutions/{institutionId}`: Institution profiles and verified affiliation state.
  - `fdrs/{fdrId}`: Fixed deposit receipts under AICTE joint lien.
  - `documents/{docId}`: Metadata for files in Firebase Storage or local vault.
  - `releases/{releaseId}`: Multi-tier statutory release applications.
  - `auditLogs/{logId}`: Append-only audit history.
- **Query Scoping**: Institution users strictly query records where `institutionId == currentUser.institutionId`. Officers and Admins query cross-institution registers.
- **Firebase Storage**: Real document upload to `documents/{institutionId}/{timestamp}_{filename}` with progress indicators and metadata linking.

### D. Security Rules
- `firestore.rules`:
  - Users can read/write only their own user document and their institution's data.
  - Users cannot alter their own `role` field.
  - Officer clearances and final approval restricted to verified officer/admin roles.
- `storage.rules`: Files readable only by the owning institution and authorized officers.

---

## 2. Step-by-Step Execution Plan

### Step 1: Provision Firebase Services
- Trigger `show_aistudio_ui` with `ui_type: "firebase_setup"` to link and provision Firestore and Firebase Auth.
- Create `firebase-blueprint.json` and `firestore.rules`.
- Install `firebase` SDK package if needed.

### Step 2: Firebase Client Services & Initialization
- Create `src/lib/firebase.ts`: Initialize Firebase App, Auth, Firestore, and Storage.
- Create `src/services/firestoreService.ts`: CRUD operations for user profiles, institutions, FDRs, documents, and release requests.
- Create `src/services/storageService.ts`: Real file uploads to Firebase Storage with progress tracking.

### Step 3: Auth Context & Protected Routing
- Overhaul `src/context/AuthContext.tsx`:
  - Hook into Firebase `onAuthStateChanged`.
  - Expose `signInWithEmail`, `signUpWithEmail`, `signInWithGoogle`, `resetPassword`, `signOut`, and `enterDemoMode`.
  - Maintain clean separation between `currentUser` (real Firebase user) and `demoUser` (in demo mode).
- Update `src/App.tsx`:
  - Show public Landing/Auth pages if not signed in and not in demo mode.
  - Render full portal once signed in or when entering demo mode.
  - Display persistent "Demo Mode Active — Simulated Data" banner with "Exit Demo" button when demo mode is active.

### Step 4: Authentication UI Components
- Build `src/pages/auth/LandingPage.tsx`: Public introduction with Call-to-Actions.
- Build `src/pages/auth/LoginPage.tsx`: Full-screen sign-in with Email/Password, Google button, forgot password, error alerts, and demo mode button.
- Build `src/pages/auth/RegisterPage.tsx`: Full-screen registration with institution selector and validation.
- Build `src/pages/auth/ForgotPasswordModal.tsx`: Simple reset email trigger.

### Step 5: Real Data & Document Storage Integration
- Connect `FDRCreate.tsx`, `FDRList.tsx`, `DocumentVault.tsx`, and `ReleaseRequests.tsx` to real Firestore/Storage collections when in real authenticated mode.
- Display empty states with zero counts for newly registered institutions.

### Step 6: Testing & Verification
- Test registration with new email and password.
- Test sign-out and session persistence across page refreshes.
- Test Google sign-in flow.
- Test data isolation: verifying that user A cannot see user B's deposits or vault files.
- Test Demo Mode isolation and "Exit Demo" function.
- Run `npm run build` and `npm run lint`.

---

## 3. Verification & Acceptance Criteria
1. Unauthenticated users see only the public landing/sign-in pages.
2. Self-registration assigns `INSTITUTION` role without bypass.
3. Sign-in, sign-out, and password reset work as expected.
4. Real files upload to storage and appear only in the uploader's Document Vault.
5. Demo mode is clearly isolated and labelled.
6. Build and type-checking pass with 0 errors.
