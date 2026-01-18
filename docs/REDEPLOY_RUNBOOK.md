# Redeploy + Verification Runbook (Backend, Web Preview, Mobile, APK, Production)

## 1) Redeploy (Local Verification First)

### Backend (local)
- Install + build:
  - `cd backend`
  - `npm ci`
  - `npm run build`
- Start:
  - `npm run start`
- Verify:
  - `GET http://localhost:10000/`
  - `GET http://localhost:10000/api/health`
  - `HEAD http://localhost:10000/` (Render uses HEAD checks)

### Web Preview (Expo Web)
- Install:
  - `cd mobile`
  - `npm ci`
- Start web preview:
  - `npx expo start --web`
- Verify:
  - Open the printed localhost URL (usually `http://localhost:19006` then choose Web).

## 2) Mobile App Verification (Development)

### Important limitation (Expo Go)
- This project uses native modules (example: `@react-native-firebase/*`).
- Expo Go cannot load arbitrary native modules.
- Use a Dev Client build instead of Expo Go for device testing.

### Dev Client workflow (recommended)
- Create a dev build:
  - `cd mobile`
  - `npx eas-cli build --profile debug --platform android`
- Start metro for dev client:
  - `npx expo start --dev-client`
- Scan the QR code with the device that has the dev build installed.

### What to test (do)
- Auth: login, logout, session persistence.
- Users list: load, search (if present), open chat.
- Chat: send/receive, reconnect behavior, basic rate-limit behavior.
- Media: upload and view (requires backend auth).
- Private mode: start session, send message, verify expiry behavior.
- Feed: load posts, create post, like/unlike.
- AI: basic prompt/response (provider dependent).

### What to skip (unless you explicitly need it)
- Push notifications (depends on FCM/APNs + device tokens).
- Sentry sourcemap validation (only meaningful on release/dev builds).
- Multi-instance socket scaling (needs Redis adapter + multiple instances).

## 3) Android APK Generation (Signed)

### Recommended outputs
- Store submission: AAB (Google Play preferred).
- Direct distribution / smoke testing: APK.

### Build (APK)
- Ensure an Android “preview/apk” profile exists in `mobile/eas.json`.
- Run:
  - `cd mobile`
  - `npx eas-cli build --profile preview --platform android`
- Download artifact from EAS output URL.

### Basic APK smoke test
- Install on a test device.
- Verify app launches, login works, and `/api/health` is reachable.

### Archive artifacts
- Store builds under a versioned folder:
  - `release/android/<version>/<build-number>/`
- Keep release notes + environment notes alongside the artifacts.

## 4) Final Deployment (Production + Custom Domain)

### Backend (Render)
- Ensure environment variables are set (MongoDB, Firebase Admin, Cloudinary, AI, Sentry).
- Deploy latest `main`.
- Post-deploy checks:
  - `GET https://<domain>/api/health`
  - `GET https://<domain>/health/extended` (if enabled)

### Custom domain + DNS + SSL
- Add custom domain in Render dashboard.
- Create the required DNS records (A/CNAME) at your DNS provider.
- Wait for SSL certificate provisioning to complete.
- Validate HTTPS:
  - No mixed content errors on web.
  - Mobile points to the correct `EXPO_PUBLIC_API_BASE_URL` and socket URL.

### Document the release
- Tag the git commit used for the deployment.
- Record:
  - app version/build number
  - backend commit SHA
  - key env var changes (not secrets)
  - any known issues
