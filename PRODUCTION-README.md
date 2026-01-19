# Deployment Guide for ChatBull Calling Features

## Overview
This document describes how to deploy the ChatBull backend with the newly implemented calling features (WebRTC signaling, Screen Sharing support) to a production environment like Render.

## Prerequisites
- **Render Account**: You must have access to the Render Dashboard.
- **MongoDB Atlas**: A production-ready MongoDB cluster.
- **Firebase Project**: Service account credentials for push notifications.

## Deployment Steps

### 1. Push Code Changes
Ensure all your local changes (especially `src/socket/callHandler.ts` and `src/models/Call.ts`) are committed and pushed to the `main` branch of your GitHub repository.

```bash
git add .
git commit -m "feat: calling features ready for production"
git push origin main
```

### 2. Configure Render Environment
The deployment will fail if the required environment variables are missing.
Go to **Render Dashboard** -> **chatbull-backend** -> **Environment** and verify/add:

| Variable | Value Description |
| :--- | :--- |
| `NODE_ENV` | `production` |
| `MONGODB_URI` | Your MongoDB connection string (e.g., `mongodb+srv://...`) |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | The full content of your `firebase-service-account.json` |
| `CORS_ORIGINS` | Comma-separated list of allowed origins (e.g., `https://chatbull.web.app,http://localhost:3000`) |

### 3. Verify Build Command
Your `render.yaml` is already configured correctly:
- **Build Command**: `cd old_version/backend && npm install && npm run build`
- **Start Command**: `cd old_version/backend && npm start`

### 4. Trigger Deployment
- If you have "Auto-Deploy" enabled, pushing to `main` will trigger a build.
- Otherwise, go to Render Dashboard -> **Manual Deploy** -> **Deploy latest commit**.

## Post-Deployment Verification

### Check Health Endpoint
Visit your deployed URL (e.g., `https://chatbull-backend.onrender.com/health/extended`).
Response should be:
```json
{
  "status": "OK",
  "services": {
    "database": "healthy",
    "firebase": "healthy"
  }
}
```

### Verify Calling Socket
The calling features run on the same Socket.IO instance.
- **Socket URL**: `https://chatbull-backend.onrender.com`
- **Namespace**: `/` (Default)
- **Events**: `call:start`, `call:incoming`, etc.

## Troubleshooting

### "MongoDB connection error"
- **Cause**: Invalid `MONGODB_URI` or IP whitelist issues on MongoDB Atlas.
- **Fix**: Check Render logs and ensure `0.0.0.0/0` (or Render's IP) is allowed in Atlas.

### "Signaling error"
- **Cause**: STUN/TURN servers might be blocked by corporate firewalls.
- **Fix**: The current implementation uses public Google STUN servers. For strict enterprise networks, you may need to configure a TURN server (e.g., Twilio, Coturn) and update `CallManager.ts`.

## Mobile App Deployment
For the mobile app to work with the new calling features:
1. Update the API/Socket URL in your mobile app config to point to the production backend.
2. Build a new binary (`eas build --profile production`) if you changed native dependencies (like `react-native-webrtc`).
3. Submit to App Store / Play Store.
