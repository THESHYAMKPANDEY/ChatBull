# ChatBull Master Deployment Guide

This guide covers the complete deployment process for ChatBull using **Render** (Backend & Web) and **Expo EAS** (Mobile App).

---

## 🛑 Phase 0: Prerequisites & Security Check

Before you start, ensure you have these ready:

1.  **GitHub Repository**: Your code must be pushed to GitHub.
2.  **Render Account**: Sign up at [dashboard.render.com](https://dashboard.render.com).
3.  **Firebase Project**:
    *   Go to [console.firebase.google.com](https://console.firebase.google.com).
    *   Enable **Authentication** (Email/Password).
    *   Go to **Project Settings** > **Service Accounts** > **Generate New Private Key**.
    *   Save this JSON file; you will need its content for the Backend.
4.  **MongoDB Atlas**:
    *   Ensure you have your Connection String (starts with `mongodb+srv://...`).
5.  **Encryption Key**:
    *   You should have your 32-byte hex key ready (generated via `openssl rand -hex 32`).

---

## 🚀 Phase 1: Deploy Backend (Render)

This hosts your Node.js server/API.

1.  **Create Service**:
    *   Log in to Render Dashboard.
    *   Click **New +** -> **Web Service**.
    *   Connect your GitHub repository `Chatbull`.

2.  **Configure Settings**:
    *   **Name**: `chatbull-backend`
    *   **Region**: Choose one close to you (e.g., Singapore, Frankfurt, Ohio).
    *   **Branch**: `main`
    *   **Root Directory**: `old_version/backend` (Critical! Your backend code is here).
    *   **Runtime**: `Node`
    *   **Build Command**: `npm install && npm run build`
    *   **Start Command**: `npm start`
    *   **Plan**: Free (or Starter for production speed).

3.  **Environment Variables** (Click "Advanced" or "Environment"):
    *   Add the following keys and values:
        *   `MONGODB_URI`: `your_mongodb_connection_string`
        *   `FIREBASE_SERVICE_ACCOUNT_JSON`: Paste the **entire content** of the Firebase JSON file you downloaded.
        *   `ENCRYPTION_KEY`: `your_32_byte_hex_key`
        *   `SMTP_HOST`: `smtp.gmail.com` (if using Gmail)
        *   `SMTP_USER`: `your_email@gmail.com`
        *   `SMTP_PASS`: `your_app_specific_password`
        *   `PORT`: `10000` (Render sets this auto, but good to know).

4.  **Deploy**:
    *   Click **Create Web Service**.
    *   Wait for the logs to say "Server running on port...".
    *   **Copy your Backend URL** (e.g., `https://chatbull-backend.onrender.com`). You need this for the Mobile/Web app.

---

## 🌐 Phase 2: Deploy Web App (Render Static Site)

This hosts the browser version of your app (`www.chatbull.com`).

1.  **Update Config**:
    *   In your code (`mobile/src/config/api.ts` or `.env`), ensure the API URL points to your **New Backend URL** from Phase 1.
    *   Commit and push this change to GitHub if needed.

2.  **Create Service**:
    *   In Render Dashboard, click **New +** -> **Static Site**.
    *   Connect the same GitHub repository.

3.  **Configure Settings**:
    *   **Name**: `chatbull-web`
    *   **Root Directory**: `mobile`
    *   **Build Command**: `npm run build:web`
    *   **Publish Directory**: `dist` (or `web-build` if you haven't changed default).

4.  **Deploy**:
    *   Click **Create Static Site**.
    *   Render will build your React Native Web app and host it.

5.  **Custom Domain (GoDaddy)**:
    *   In Render (Static Site settings), go to **Settings** > **Custom Domains**.
    *   Add `www.chatbull.com`.
    *   Render will show you a **CNAME** value (e.g., `chatbull-web.onrender.com`).
    *   Go to GoDaddy DNS Management.
    *   Add/Edit **CNAME** for `www` and point it to the Render URL.

---

## 📱 Phase 3: Deploy Mobile App (Android/iOS)

This builds the `.apk` or `.aab` file for the Play Store.

1.  **Configure EAS**:
    *   Ensure `mobile/app.json` has the correct `bundleIdentifier` and `package`.
    *   Ensure `mobile/src/config/api.ts` points to your **Production Backend URL**.

2.  **Build for Android**:
    *   Open terminal in your local `mobile` folder.
    *   Run:
        ```bash
        eas build -p android --profile production
        ```
    *   If asked to log in, log in with your Expo account.
    *   Wait for the build to finish (can take 10-20 mins).
    *   Download the `.aab` file (for Play Store) or `.apk` (for direct install).

---

## ✅ Phase 4: Verification

1.  **Backend Health**: Visit `https://your-backend-url.onrender.com/health`. It should say "OK".
2.  **Web Login**: Go to your custom domain, try to log in.
3.  **Mobile App**: Install the APK, try to send a secure message.
