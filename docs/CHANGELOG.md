# Changelog (Unreleased)

## Backend
- Added Socket.IO handshake authentication using Firebase ID tokens; server no longer trusts client-supplied `senderId`/`userId`.
- Required authentication for media uploads and screenshot/security logging endpoints.
- Restricted `/api/test/*` routes to non-production and tied device token operations to the authenticated user.
- Tightened CORS behavior to support an allowlist via `CORS_ORIGINS` (falls back to permissive when unset).
- Moved Express error handler to the end of the middleware chain.
- Replaced blocking filesystem operations in media and AI transcription paths with async equivalents.
- Switched request/error file logging to a non-blocking stream and redacted sensitive fields.
- Added missing data models: `Group` and `EphemeralSession`.
- Added backend unit tests + coverage reporting (Jest + Supertest).
- Resolved backend npm audit vulnerabilities using npm `overrides`.

## Mobile
- Authenticated Socket.IO connections using the Firebase ID token.
- Reduced API client logging to development-only; removed token/response body logging in production builds.
- Enabled call screen from chat via a dedicated call button (Zego prebuilt call).
- Removed React Navigation dependency from the call screen; call screen now uses explicit props.
- Disabled Android cleartext traffic by default and fixed iOS bundle identifier typo.
- Added `.env.example` entries for ZegoCloud call configuration.
- Added OTP login options: SMS OTP (phone) + Email OTP (custom-token flow).
- Switched mobile auth implementation to `@react-native-firebase/auth` to support phone OTP.
