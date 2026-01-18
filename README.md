# ChatBull

ChatBull is a private company project owned and maintained by ChatBull Inc. It provides secure, real-time communication across mobile and web clients.

This repository is intended for internal development and controlled deployment only.

## Product Overview
- Real-time messaging using Socket.IO
- Private mode for ephemeral sessions
- Media upload support
- Optional AI assistant integration
- Security hardening: Helmet headers, rate limiting, input validation, NoSQL injection mitigation

## Requirements
- Node.js 22.x
- MongoDB Atlas (or compatible MongoDB)
- Firebase project (Authentication enabled)
- Render account (for backend deployment) or equivalent Node hosting

## Backend (Production)
1. Configure environment variables using [backend/.env.example](file:///d:/New%20folder%20(3)/Chatbull/backend/.env.example).
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

## License
See [LICENSE](file:///d:/New%20folder%20(3)/Chatbull/LICENSE).

## Contact
- Email: support@chatbull.com
