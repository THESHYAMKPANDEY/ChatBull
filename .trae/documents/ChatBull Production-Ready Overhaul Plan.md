# ChatBull Production-Ready Overhaul Plan

This plan outlines the steps to secure, modernize, and complete the ChatBull platform, transforming it from a prototype into a production-ready social application with real-time calling and monetization.

## 1. Security & Repository Hygiene (IMMEDIATE PRIORITY)

**Goal:** Remove exposed secrets and prevent future leaks.

1. **Secret Sanitization**:

   * Identify all files containing secrets (`backend/.env`, `mobile/.env`, `google-services.json`).

   * Create `git-filter-repo` script to permanently scrub these files from Git history.

   * **User Action Required**: You will need to rotate your MongoDB password and Firebase Service Account keys immediately after this step, as the old ones are compromised.
2. **Environment Configuration**:

   * Create `backend/.env.example` and `mobile/.env.example` with safe placeholders.

   * Update `.gitignore` to strictly exclude `.env`, `*.json` (credentials), and build artifacts.

## 2. Backend Modernization & Fixes

**Goal:** Ensure a stable, type-safe, and deployable backend.

1. **TypeScript & Dependencies**:

   * Install missing type definitions (`@types/express`, `@types/node`, etc.).

   * Fix `tsconfig.json` settings (`esModuleInterop`, `resolveJsonModule`).

   * Add production scripts (`build`, `start`) to `package.json`.
2. **Firebase Admin Hardening**:

   * Refactor `notifications.ts` to prioritize `FIREBASE_SERVICE_ACCOUNT_JSON` environment variable.

   * Add robust error handling for missing credentials.
3. **Render Deployment Prep**:

   * Configure `engines` field in `package.json` for Node 18/20.

   * Ensure the health check endpoint `/health` is robust.

## 3. Infrastructure & CI/CD

**Goal:** Automate deployments and ensure code quality.

1. **GitHub Actions**:

   * Create `.github/workflows/deploy.yml` for CI/CD.

   * Automate testing and deployment to Render on push to `main`.
2. **Render Configuration**:

   * Provide a complete list of required Environment Variables.

   * Document the "Web Service" setup process.

## 4. Feature Implementation: Real-Time Calling (WebRTC)

**Goal:** Add voice and video call capabilities.

1. **Backend Signaling**:

   * Extend Socket.IO with a `/call` namespace.

   * Implement signaling events: `call:offer`, `call:answer`, `call:ice-candidate`, `call:hangup`.
2. **Mobile Implementation**:

   * Install `react-native-webrtc`.

   * Create a `CallScreen` component handling the media stream and signaling.

   * Implement "Incoming Call" notifications/modals.

## 5. Feature Implementation: Advanced Social Features

**Goal:** Match features of modern social apps (Instagram+Twitter+Whatsapp+X+telegram). everything and the main feature of this app will be a private tab/profile whenver a user open it it will genrate a unquie ID and user can chat or do many things and when the user exit the private tab the data will be delted and a public tab/profile and some more featuers that you like

1. **Database Schema Updates**:

   * Update `Post` model to support: Likes, Comments (threaded), Reposts, Hashtags.

   * Update `User` model for: Followers/Following.
2. **API Development**:

   * Create endpoints for social interactions (toggle like, add comment, follow user).

   * Implement "Trending" algorithm (basic aggregation).

   * Implement "Search" (users and hashtags).

     <br />

## 6. Feature Implementation: Monetization (Stripe)

**Goal:** Add premium subscription gating.

1. **Backend Integration**:

   * Install `stripe` SDK.

   * Create endpoints: `/api/subscriptions/create-checkout-session`, `/api/webhooks/stripe`.

   * Update `User` model to track `isPremium` status.
2. **Feature Gating**:

   * Add middleware to restrict specific features (e.g., "verified badge", "extended video upload") to premium users.

## 7. Mobile Polish & Web Client

**Goal:** Improve UX and expand platform reach.

1. **Mobile UI/UX**:

   * Refine `FeedScreen` with card layouts and interaction buttons.

   * Polish `ChatScreen` with message bubbles and status indicators.
2. **Web Client (Basic)**:

   * Create a simple React web client (if requested in scope, otherwise focus on mobile polish).

## 8. Verification & Handoff

1. **Smoke Tests**:

   * Generate a `curl` / Postman script to verify all core endpoints.
2. **Documentation**:

   * Update `README.md` with setup, deployment, and secret management instructions.

**Ready to proceed?** confirming this plan will allow me to start executing Step 1 (Secret Sanitization) immediately.
