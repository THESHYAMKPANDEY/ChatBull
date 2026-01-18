# Deployment Guide for Chatbull

This guide provides step-by-step instructions for deploying the Chatbull application (Backend & Mobile/Web).

## Prerequisites

- **Node.js**: v18 or later
- **MongoDB**: v6.0 or later (or MongoDB Atlas)
- **Firebase Project**: Authentication & Storage enabled
- **Redis** (Optional): For socket.io adapter in multi-instance setup

---

## 1. Backend Deployment

The backend is an Express.js server with Socket.io.

### Environment Setup
Create a `.env` file in the `backend/` directory:

```env
PORT=5000
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/chatbull
JWT_SECRET=your_production_secret_key_min_32_chars
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json
# Optional
REDIS_URL=redis://localhost:6379

# AI Provider
# rules  = built-in local bot (no GPU needed)
# ollama = local/hosted LLM served by Ollama
AI_PROVIDER=rules
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=phi3:mini
```

### Build & Run
1. **Install Dependencies**:
   ```bash
   cd backend
   npm install --production
   ```

2. **Build TypeScript**:
   ```bash
   npm run build
   ```

3. **Start Server**:
   ```bash
   npm start
   ```
   *For production process management, use PM2:*
   ```bash
   npm install -g pm2
   pm2 start dist/index.js --name "chatbull-backend"
   ```

### Security Checklist
- [ ] Ensure `MONGO_URI` is secure and IP-whitelisted.
- [ ] Rotate `JWT_SECRET` periodically.
- [ ] Enable SSL/TLS (HTTPS) using Nginx or a cloud load balancer.
- [ ] Set `NODE_ENV=production` to enable optimization.
- [ ] Do NOT expose Ollama directly to the public internet (keep it private to the backend).

### AI for Public Users

If you want the AI to work for the public app, you must run an AI provider on a server (or use the built-in rules bot):

- **Option A (No GPU):** `AI_PROVIDER=rules`
  - Works everywhere, cheap, fast, but not a real LLM.
- **Option B (Real AI, GPU recommended):** `AI_PROVIDER=ollama`
  - Run Ollama on the same server as backend, or in the same private network (VPC / Docker network).
  - Point backend to it via `OLLAMA_BASE_URL`.
  - Recommended models for low VRAM: `phi3:mini`, `llama3.2:3b`.

Important: Keep `OLLAMA_BASE_URL` private. Only the backend should call it.

---

## 2. Mobile/Web App Deployment

The mobile app is built with Expo (React Native).

### Environment Configuration
Create a `.env` file in the `mobile/` directory:

```env
EXPO_PUBLIC_API_BASE_URL=https://your-backend-domain.com
EXPO_PUBLIC_SOCKET_BASE_URL=https://your-backend-domain.com
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
# ... other firebase config keys
```

### Web Deployment
1. **Build Web Bundle**:
   ```bash
   cd mobile
   npx expo export -p web
   ```
   This creates a `dist/` folder.

2. **Serve Static Files**:
   Upload the `dist/` folder to Vercel, Netlify, or serve via Nginx.

### Mobile Deployment (Android/iOS)
1. **Configure `app.json`**:
   Ensure `bundleIdentifier` and `package` names are unique.

2. **Build with EAS**:
   ```bash
   npm install -g eas-cli
   eas login
   eas build --profile production --platform all
   ```

3. **Submit to Stores**:
   ```bash
   eas submit --platform all
   ```

---

## 3. Post-Deployment Verification

1. **Health Check**:
   Visit `https://your-backend-domain.com/health` to verify API status.
2. **Socket Connection**:
   Open the app and check if the "Online" indicator works.
3. **Private Mode**:
   Enter Private Mode to ensure key exchange and encryption work (requires HTTPS).
4. **Media Upload**:
   Upload a profile picture to verify Firebase Storage rules.

## 4. Maintenance

- **Logs**: Monitor PM2 logs (`pm2 logs`) or use a logging service (Datadog/Sentry).
- **Backups**: Schedule daily MongoDB dumps.
- **Updates**: Use `eas update` for over-the-air (OTA) hotfixes on mobile.
