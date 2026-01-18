# Release Checklist (App Stores + Privacy Compliance)

## Pre-Release Engineering
- Backend deploy succeeds and `/api/health` returns 200.
- Mobile TypeScript check passes (`npx tsc --noEmit`).
- CI is green (backend build + tests, mobile type-check).
- Secrets are not in git (`.env`, Firebase config files, coverage, dist).
- Database backups are enabled and a restore drill has been completed.
- Production environment variables are configured (MongoDB, Firebase Admin, Cloudinary, AI provider).

## Observability
- Sentry DSN is configured:
  - Backend: `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_RELEASE`
  - Mobile: `EXPO_PUBLIC_SENTRY_DSN`, `EXPO_PUBLIC_SENTRY_ENVIRONMENT`, `EXPO_PUBLIC_SENTRY_RELEASE`
- Verify an intentional test error appears in Sentry for:
  - Backend API error
  - Mobile runtime error

## Privacy Policy + Legal
- Privacy policy is reachable from within the app and on the web:
  - Backend endpoint: `/api/legal/privacy`
- The privacy policy matches actual behavior:
  - What data is collected (account info, chat content, device identifiers, analytics, crash logs)
  - Retention windows (private mode TTL, security telemetry TTL, AI history TTL)
  - Account deletion process and timelines
- Ensure “Contact Us” email is real and monitored.

## App Store (iOS) Checklist
- App privacy details completed in App Store Connect:
  - Crash data (Sentry), diagnostics, usage data, identifiers (if any)
  - Data linked to the user vs not linked
  - Data used for tracking (should be “No” unless you implement tracking)
- App has:
  - Account deletion flow (or a clear path) and it works end-to-end
  - Privacy policy URL set in App Store listing
- Ensure iOS build settings:
  - Correct bundle identifier
  - Production signing via EAS
  - No debug endpoints or test keys

## Google Play Checklist
- Data safety form completed:
  - Data collected and shared (crash logs, device identifiers, user content)
  - Security practices (encryption in transit, account deletion)
- Ensure Android build settings:
  - Correct applicationId
  - Release signing via EAS
- Confirm permissions match features and are justified.

## Security + Abuse Controls
- Media upload requires authentication and has rate limits.
- Socket.IO has basic rate limiting and input validation.
- Auth middleware never logs tokens or request bodies.
- CORS is configured appropriately for your clients.

## Production Rollout
- Versioning:
  - Bump app version and build number before submission
  - Set Sentry release identifiers to match app version
- Monitoring:
  - Monitor backend error rate, latency, and crash-free users in Sentry after release
- Support:
  - Prepare a support email and response process for account/privacy requests

