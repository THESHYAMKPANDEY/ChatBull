# OTP Authentication

## SMS OTP (Phone)
- Implemented cross-platform:
  - Android/iOS: native Firebase Auth via `@react-native-firebase/auth`
  - Web: Firebase JS SDK phone auth using reCAPTCHA verifier
- Android/iOS requires real builds (EAS dev build / store build), not Expo Go.

### Firebase Console Setup
- Authentication → Sign-in method → enable **Phone**.

### Mobile Setup
- Ensure native Firebase config files exist:
  - `mobile/google-services.json`
  - `mobile/GoogleService-Info.plist`
- Build with EAS (required for native auth modules).

### Web Setup
- Ensure Firebase Web config env vars exist:
  - `EXPO_PUBLIC_FIREBASE_API_KEY`
  - `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
  - `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
  - `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
  - `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
  - `EXPO_PUBLIC_FIREBASE_APP_ID`

## Email OTP (Code)
Firebase Auth does not provide “email OTP codes” out-of-the-box. This project implements email OTP using:
- Backend-generated OTP code (6 digits) sent via SMTP
- Backend verifies OTP and issues a Firebase **custom token**
- Mobile signs in using `signInWithCustomToken`

### Backend Setup
- Configure Firebase Admin:
  - `FIREBASE_SERVICE_ACCOUNT_JSON`
- Configure SMTP:
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- Optional:
  - `EMAIL_OTP_TTL_MINUTES` (default 10)

### Endpoints
- `POST /api/auth/email-otp/send` `{ email }`
- `POST /api/auth/email-otp/verify` `{ email, otp }` → `{ customToken }`

## Notes
- After any OTP sign-in, the app calls `/api/auth/sync` to create/update the app user record.
- Phone-only users can exist without email; backend user schema supports optional `email`.
