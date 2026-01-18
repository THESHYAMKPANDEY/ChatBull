# Deployment & Custom Domain Guide

## 1. Backend Deployment (Render)

Your backend is located in `old_version/backend`. This is the fully featured version.

### Steps:
1.  **Push to GitHub**: Ensure your code is pushed to your repository.
2.  **Create Service on Render**:
    *   Go to [dashboard.render.com](https://dashboard.render.com).
    *   Click **New +** -> **Web Service**.
    *   Connect your GitHub repository.
3.  **Configuration**:
    *   **Root Directory**: `old_version/backend`
    *   **Build Command**: `npm install && npm run build`
    *   **Start Command**: `npm start`
    *   **Environment Variables**:
        *   `MONGODB_URI`: Your MongoDB connection string.
        *   `FIREBASE_SERVICE_ACCOUNT_JSON`: Your Firebase admin credentials.
        *   `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`: For Email OTP (e.g., Gmail).
        *   `ENCRYPTION_KEY`: **(Required)** A 32-byte hex string for AES-256 database encryption. Generate using `openssl rand -hex 32`.
        *   `SECURITY_LEVEL`: Set to `high` for strict military-grade enforcement.

## 2. Frontend Web Deployment (Custom Domain)

You will deploy the web version of your mobile app to your custom domain (GoDaddy).

### Steps:
1.  **Build the Web App**:
    *   Open terminal in `mobile` folder.
    *   Run: `npm run build:web`
    *   This creates a `dist` (or `web-build`) folder with `index.html` and assets.
2.  **Upload to Hosting**:
    *   You can host this on **Netlify**, **Vercel**, or **Render Static Site**.
    *   **Recommended**: Use **Netlify** or **Vercel** for free SSL and easy domain setup.
    *   Drag and drop the `dist` folder to deploy.
3.  **Connect GoDaddy Domain**:
    *   In Netlify/Vercel, go to **Domain Settings** -> **Add Custom Domain**.
    *   Enter your GoDaddy domain (e.g., `chatbull.com`).
    *   **DNS Setup**:
        *   Log in to GoDaddy.
        *   Go to DNS Management.
        *   Add the **CNAME** or **A Record** provided by Netlify/Vercel.

## 3. Android Deployment (Play Store)

Since your app uses native modules (ZegoCloud, Encrypted Storage), you must use a custom build.

### Preview on Laptop (Android Studio):
1.  Open Android Studio and start an Emulator.
2.  In `mobile` folder, run: `npm run android:build`
3.  This will compile the native app and install it on the emulator.

### Build for Play Store:
1.  **Using EAS (Recommended)**:
    *   Run: `eas build --platform android`
    *   Download the `.aab` file.
2.  **Upload**:
    *   Go to **Google Play Console**.
    *   Create a new release.
    *   Upload the `.aab` file.

## 4. Verification Checklist

- [ ] **Backend**: Visit `https://your-backend.onrender.com/health` -> Should return "OK".
- [ ] **Web**: Visit your custom domain -> Should load the login screen.
- [ ] **App**: Login via Email OTP -> Should receive email and login successfully.
- [ ] **Features**:
    - [ ] Post a Story (check if it appears in feed).
    - [ ] Comment on a post.
    - [ ] Save a post (check profile -> saved tab).
