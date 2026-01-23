## What Exists
- Firebase SDK v9 is initialized and exported: see app/auth in firebase.ts [firebase.ts](file:///d:/New%20folder%20(3)/Chatbull/mobile/src/config/firebase.ts#L16-L56).
- Phone OTP flow is already implemented: startPhoneOtp and confirmPhoneOtp in authClient.ts [authClient.ts](file:///d:/New%20folder%20(3)/Chatbull/mobile/src/services/authClient.ts#L23-L38).
- Login UI calls this flow and renders a reCAPTCHA container on web: LoginScreen.tsx [LoginScreen.tsx](file:///d:/New%20folder%20(3)/Chatbull/mobile/src/screens/LoginScreen.tsx#L170-L177) and [LoginScreen.tsx](file:///d:/New%20folder%20(3)/Chatbull/mobile/src/screens/LoginScreen.tsx#L390-L393).
- Auth state observer is in place: App.tsx [App.tsx](file:///d:/New%20folder%20(3)/Chatbull/mobile/App.tsx#L93-L131).

## Prerequisites
- Enable Phone provider in Firebase Console and set SMS region policy.
- Add your hosted domain to Authorized domains. For local development, use test phone numbers or the Auth Emulator (localhost is not accepted for real SMS flows).
- Ensure appConfig contains Firebase keys; verify no missing keys in production [firebase.ts](file:///d:/New%20folder%20(3)/Chatbull/mobile/src/config/firebase.ts#L19-L33).

## Web reCAPTCHA Setup
- Use invisible reCAPTCHA anchored to the submit button for best UX.
- Adjust startPhoneOtp to accept the button element id; create RecaptchaVerifier(auth, 'sign-in-button', { size: 'invisible' }).
- Pre-render on page load (optional) and store widgetId to allow grecaptcha.reset(widgetId) on failures.

## Send Code Flow
- On phone input submit, call signInWithPhoneNumber(auth, phoneNumber, appVerifier).
- Handle errors and throttle; on error, reset the reCAPTCHA and let the user retry.
- Show clear messaging about receiving an SMS and that standard rates apply.

## Verify Code Flow
- Prompt for the 6‑digit code; call confirmationResult.confirm(code).
- On success, continue existing backend sync via api.syncUser.
- On invalid code, display user‑friendly errors.

## Localization
- Set auth.languageCode or useDeviceLanguage to localize reCAPTCHA and SMS.

## Testing
- Configure fictional phone numbers in Firebase Console; use them to avoid quotas and throttling.
- In development, (web only) set auth.settings.appVerificationDisabledForTesting = true before rendering RecaptchaVerifier; guard behind a dev flag and never ship to production.

## Security & UX
- Inform users of tradeoffs of phone‑only auth; offer alternative sign‑in methods (already present with email/password).
- Avoid logging OTPs or PII; ensure secure storage of any test numbers.

## Planned Code Changes After Approval
- Refine RecaptchaVerifier anchor to the actual submit button id for invisible reCAPTCHA.
- Add optional pre‑render and reset helper around reCAPTCHA.
- Add language localization on the Auth instance.
- Add dev‑only appVerificationDisabledForTesting path and documentation.
- Align docs (OTP_AUTH.md) with the current JS SDK usage on web.