# Deploying ChatBull to a Custom Domain (GoDaddy)

This guide explains how to deploy the ChatBull backend to a hosting provider and connect it to your custom domain purchased from GoDaddy.

## Prerequisites

1.  **GoDaddy Account:** You have purchased a domain (e.g., `yourchatbull.com`).
2.  **GitHub Account:** Your backend code is pushed to a GitHub repository.
3.  **Hosting Provider Account:** We recommend **Render** (easiest for Node.js) or **DigitalOcean** / **Heroku**. This guide uses **Render** as the example because it is free-tier friendly and easy to configure.

---

## Phase 1: Deploying the Backend to Render

1.  **Sign Up/Login to Render:**
    *   Go to [dashboard.render.com](https://dashboard.render.com/).
    *   Sign in with your GitHub account.

2.  **Create a New Web Service:**
    *   Click **"New +"** and select **"Web Service"**.
    *   Select your `ChatBull` repository (specifically the `backend` folder if it's a monorepo, or the root if you separated them).
    *   **Note:** If your repo has both `mobile` and `backend`, you might need to specify the `Root Directory` as `backend` in the settings below.

3.  **Configure the Service:**
    *   **Name:** `chatbull-api` (or similar).
    *   **Region:** Choose the one closest to your users (e.g., Oregon, Frankfurt).
    *   **Branch:** `main` (or your production branch).
    *   **Root Directory:** `backend` (Important! Since your `package.json` is inside the `backend` folder).
    *   **Runtime:** `Node`
    *   **Build Command:** `npm install && npm run build` (or `yarn install && yarn build`)
    *   **Start Command:** `npm start` (This runs `node dist/index.js` as per your package.json).

4.  **Environment Variables:**
    *   Scroll down to "Environment Variables" and add the keys from your local `.env` file:
        *   `NODE_ENV`: `production`
        *   `PORT`: `10000` (Render uses this port by default)
        *   `MONGODB_URI`: Your production MongoDB connection string (e.g., from MongoDB Atlas).
        *   `JWT_SECRET`: A strong, random string.
        *   `FIREBASE_SERVICE_ACCOUNT`: Your Firebase JSON content (as a single line string) or handle Firebase auth via other means if configured.
        *   `CLOUDINARY_CLOUD_NAME`: (If used)
        *   `CLOUDINARY_API_KEY`: (If used)
        *   `CLOUDINARY_API_SECRET`: (If used)
        *   `OPENAI_API_KEY`: Your OpenAI key.

5.  **Deploy:**
    *   Click **"Create Web Service"**.
    *   Wait for the deployment to finish. You will get a URL like `https://chatbull-api.onrender.com`.

---

## Phase 2: Connecting Your GoDaddy Domain

Now we will point `api.yourchatbull.com` (or the root domain) to your Render backend.

### Option A: Using a Subdomain (Recommended)
This is best if you want `api.yourchatbull.com` for the backend and `www.yourchatbull.com` for a landing page later.

1.  **In Render Dashboard:**
    *   Go to your Web Service settings.
    *   Find the **"Custom Domains"** tab.
    *   Click **"Add Custom Domain"**.
    *   Enter `api.yourchatbull.com`.
    *   Render will verify it and tell you to create a `CNAME` record.

2.  **In GoDaddy DNS Management:**
    *   Log in to GoDaddy -> My Products -> Manage DNS for your domain.
    *   Click **"Add"**.
    *   **Type:** `CNAME`
    *   **Name:** `api`
    *   **Value:** `chatbull-api.onrender.com` (The URL Render gave you, usually your default service URL).
    *   **TTL:** `1 Hour` (or Default).
    *   Click **"Save"**.

3.  **Verification:**
    *   Go back to Render. It might take a few minutes to verify.
    *   Once verified, Render automatically issues a **free SSL certificate** (HTTPS).

### Option B: Using the Root Domain (yourchatbull.com)
1.  **In Render:**
    *   Add `yourchatbull.com` as the custom domain.
    *   Render will ask you to create an `A` record pointing to their IP address `216.24.57.1` (check Render docs for the latest IP, they usually provide it in the dashboard).

2.  **In GoDaddy:**
    *   Find the existing `A` record with Name `@`.
    *   Edit it (or add a new one if missing) to point to the IP Render provided.
    *   **Type:** `A`
    *   **Name:** `@`
    *   **Value:** `216.24.57.1` (Example IP)
    *   **TTL:** `1 Hour`

---

## Phase 3: Updating the Mobile App

Now that your backend is live at `https://api.yourchatbull.com`, you need to tell the mobile app to use it.

1.  **Update Config:**
    *   Open `mobile/src/config/appConfig.ts`.
    *   You can hardcode the new URL or use an environment variable.
    *   **Recommended:** Create a `.env` file in the `mobile` folder (or use EAS Build secrets).

    ```typescript
    // mobile/src/config/appConfig.ts
    const fallbackApiBase = 'https://api.yourchatbull.com'; // UPDATE THIS
    ```

2.  **Rebuild the App:**
    *   You need to generate a new APK/AAB or republish via Expo.
    *   `npx expo publish` (for OTA updates if configured) OR
    *   `eas build --platform android` (to build a new APK/AAB).

---

## Troubleshooting

*   **SSL Errors:** If you just updated DNS, HTTPS might take up to an hour to work.
*   **CORS Errors:** If your mobile app fails to connect, ensure your Backend `index.ts` allows the origin.
    *   Currently, your backend is configured with `origin: true` (allows all), which is good for mobile apps.
*   **Database Connection:** Ensure your MongoDB Atlas (or other DB host) allows connections from "Anywhere" (`0.0.0.0/0`) or specifically whitelists Render's IPs (Render IPs change, so "Allow Anywhere" is easier for starters).

## Summary
1.  **Render:** Hosts the Node.js code.
2.  **GoDaddy:** Points the name (`api.yourdomain.com`) to Render.
3.  **Mobile App:** Is updated to talk to `https://api.yourdomain.com`.
