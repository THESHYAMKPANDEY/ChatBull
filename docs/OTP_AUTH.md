# OTP Authentication

## SMS OTP (Phone)
- Mobile: native Firebase Auth via `@react-native-firebase/auth` (real Android/iOS builds).
- Web/RN Web: Firebase JS SDK v9 with `RecaptchaVerifier` (invisible) anchored to the submit button.

### Firebase Console Setup
- Authentication → Sign-in method → enable **Phone**.
- Add your hosted domain to Authorized domains (use test numbers or emulator for localhost).

### Mobile Setup
- Ensure native Firebase config files exist:
  - `mobile/google-services.json`
  - `mobile/GoogleService-Info.plist`
- Build with EAS (required for native auth modules).

### Web/RN Web Setup
- Ensure Firebase web config is present in `appConfig` and initialized in [firebase.ts](file:///d:/New%20folder%20(3)/Chatbull/mobile/src/config/firebase.ts#L16-L56).
- Use invisible reCAPTCHA anchored to the submit button id `sign-in-button` via `RecaptchaVerifier`.
- Pre-render reCAPTCHA and reset on errors (see [authClient.ts](file:///d:/New%20folder%20(3)/Chatbull/mobile/src/services/authClient.ts#L23-L38)).
- In development only, enable `auth.settings.appVerificationDisabledForTesting = true` to test with fictional numbers.
- Set device language on Auth for localized reCAPTCHA/SMS.

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
 - For web, use fictional phone numbers in Firebase Console for manual testing and CI.
