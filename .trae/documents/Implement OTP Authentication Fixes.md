I will help you implement the User Login Authentication via OTP.

The project already has the foundation for both **SMS OTP** and **Email OTP**, but there is a bug in the backend code and some configuration is required.

### Current Status & Fixes Required

1.  **Email OTP (Backend Implemented, Bug Found)**:
    -   The backend (`old_version/backend`) has endpoints `/api/auth/email-otp/send` and `/api/auth/email-otp/verify`.
    -   **Bug**: The backend returns `{ token: ... }` but the mobile app expects `{ customToken: ... }`.
    -   **Action**: I will fix this variable name mismatch in `backend/src/routes/auth.ts`.
    -   **Config Required**: You need to set `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, and `FIREBASE_SERVICE_ACCOUNT_JSON` in your backend environment variables.

2.  **SMS OTP (Client-Side Implemented)**:
    -   The mobile app (`mobile/src/screens/LoginScreen.tsx`) uses Firebase Auth (JS SDK) for Phone Auth.
    -   **Action**: No code changes required immediately, but you must enable **Phone Authentication** in your Firebase Console.
    -   **Note**: For production native apps, using `@react-native-firebase/auth` is recommended, but the current code uses the JS SDK which works well for Web and can work on Native with proper setup (reCAPTCHA fallback).

### Implementation Plan

1.  **Fix Backend Code**: Update `old_version/backend/src/routes/auth.ts` to return `customToken` to match the mobile app's expectation.
2.  **Configuration Guide**: I will provide you with the necessary environment variables you need to add to your `.env` file for the backend to send emails and mint tokens.

I will start by fixing the backend bug.