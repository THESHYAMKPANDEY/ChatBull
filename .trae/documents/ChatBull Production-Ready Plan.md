# ChatBull Production-Ready Plan

This plan transforms ChatBull into a production-ready social platform with secure ephemeral messaging, premium features, and robust deployment.

## 1. Environment & Secrets Management

* [ ] Create `backend/.env.example` and `mobile/.env.example` with required placeholders (MONGODB\_URI, FIREBASE\_*, CLOUDINARY\_*, STRIPE\_\*, etc.).

* [ ] Add `.env` files to `.gitignore`.

* [ ] Document exact Render environment variable setup.

## 2. Backend Implementation (Node/Express)

* [ ] **Ephemeral Sessions**:

  * Implement `/api/private/start` to generate `ephemeralUserId` and `sessionId` with TTL.

  * Implement `/api/private/end` for atomic deletion of session data and messages.

  * Create `EphemeralSession` model with TTL index for auto-cleanup.

* [ ] **Ephemeral Messaging**:

  * Create `PrivateMessage` model with `sessionId`, `ephemeralUserId`, `recipientEphemeralId`.

  * Implement secure wipe logic: DB delete + Cloudinary delete + Audit log (no PII).

* [ ] **Premium & Users**:

  * Create `scripts/seedUsers.ts` to generate premium users (Amit & Shyam).

  * Implement premium gating logic (middleware) for specific routes.

* [ ] **Security & Compliance**:

  * Add rate limiting (express-rate-limit) for session creation.

  * Implement abuse report endpoint `/api/report`.

  * Add audit logging for deletions.

## 3. Frontend Implementation (Mobile - Expo)

* [ ] **UI Overhaul**:

  * Create distinct "Public" and "Private" tabs.

  * Implement Private Mode flow: Enter -> Get Session -> Chat -> Exit -> Wipe.

  * Add visual indicators for Private Mode (banners, distinct theme).

* [ ] **Premium Features**:

  * Add "Verified Badge" component (Golden Tick).

  * Implement feature gating UI (locks on premium features).

* [ ] **Media Handling**:

  * Update upload logic to tag private media and ensure deletion on session end.

## 4. Deployment & Migration

* [ ] **Render Deployment**:

  * Create deployment guide with environment variable setup.

  * Ensure health endpoints (`/health`, `/health/extended`) are ready.

* [ ] **Database Migration**:

  * Create script to initialize TTL indexes for `EphemeralSession` and `PrivateMessage`.

## 5. Verification

* [ ] **Smoke Tests**:

  * Create `smoke_test.sh` to verify API endpoints (auth, private session start/end).

  * Verify seed users creation.

* [ ] **Documentation**:

  * Update README with Private Mode details, Seeding instructions, and Secret management.

## Execution Order

1. **Environment Setup**: Create .env examples and gitignore rules.
2. **Backend Core**: Implement Ephemeral Session & Message models + Endpoints.
3. **Security**: Add Rate Limiting & Audit Logs.
4. **Seeding**: Create and verify `seedUsers.ts`.
5. **Frontend**: Implement Private Tab & Premium UI.
6. **Tests & Docs**: Create smoke tests and update documentation.
7. **Final Polish**: UI tweaks and deployment guide.

