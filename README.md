# ChatBull

ChatBull is a private, military-grade secure communication platform owned and maintained by ChatBull Inc. It provides encrypted, real-time communication across mobile and web clients with advanced privacy features.

This repository is intended for internal development and controlled deployment only.

## Product Overview
- **Military-Grade Encryption**: AES-256-GCM encryption for all messages at rest and in transit.
- **Strict Privacy**: Biometric authentication required (no passcode fallback), screenshot prevention (blurred view), and auto-clipboard clearing.
- **Ephemeral Messaging**: Private mode with self-destructing messages and "Hold-to-Decrypt" protection.
- **Secure Data Handling**: Automatic 3-strike data wipe and secure memory management.
- **Real-time Communication**: Socket.IO powered messaging.
- **Media Support**: Encrypted photo and video sharing.

## Requirements
- Node.js 22.x
- MongoDB Atlas (or compatible MongoDB)
- Firebase project (Authentication enabled)
- Render account (for backend deployment) or equivalent Node hosting

## Backend (Production)
1. Configure environment variables using [backend/.env.example](file:///d:/New%20folder%20(3)/Chatbull/backend/.env.example).
   - **Important**: Set `ENCRYPTION_KEY` to a 32-byte hex string (e.g., generated via `openssl rand -hex 32`).
2. Install and build:

```bash
cd backend
npm ci
npm run build
```

3. Start:

```bash
npm run start
```

Health endpoints:
- `/` and `/health`
- `/api/health`

## Mobile (EAS Build)
The Expo config expects these files:
- [google-services.json](file:///d:/New%20folder%20(3)/Chatbull/mobile/google-services.example.json) (example)
- [GoogleService-Info.plist](file:///d:/New%20folder%20(3)/Chatbull/mobile/GoogleService-Info.example.plist) (example)

Copy the example files to `mobile/google-services.json` and `mobile/GoogleService-Info.plist` and replace values with the correct Firebase configuration before a production build.

Build:
```bash
cd mobile
npm ci
eas build -p android --profile production
```

## Testing
Run the security test suite before deployment:
```bash
# Mobile Security Tests
cd mobile
npm test

# Backend Health Tests
cd backend
npm test
```

## License
See [LICENSE](file:///d:/New%20folder%20(3)/Chatbull/LICENSE).

## Contact
- Email: support@chatbull.com
