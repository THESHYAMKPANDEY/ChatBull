# Render Deployment Guide for ChatBull

## 1. Prerequisites
- A [Render](https://render.com) account.
- This repository pushed to GitHub.
- A MongoDB Atlas Cluster (get connection string).
- A Cloudinary account (get API credentials).
- A Firebase Project (get Service Account JSON).

## 2. Backend Service Setup
1. Click **New +** -> **Web Service**.
2. Connect your GitHub repository.
3. Select the `backend` directory as the **Root Directory** (if prompted, or set in settings).
   - *Note: If Render doesn't ask for Root Directory during creation, go to Settings > Root Directory after creation and set it to `backend`.*
4. **Build Command**: `npm install && npm run build`
5. **Start Command**: `npm run start`
6. **Instance Type**: Free or Starter.

## 3. Environment Variables
Add the following keys in the **Environment** tab:

| Key | Value Example |
|-----|---------------|
| `NODE_ENV` | `production` |
| `MONGODB_URI` | `mongodb+srv://user:pass@cluster...` |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | `{"type": "service_account", ...}` (Paste the whole JSON minified on one line) |
| `CLOUDINARY_CLOUD_NAME` | `your_cloud_name` |
| `CLOUDINARY_API_KEY` | `your_api_key` |
| `CLOUDINARY_API_SECRET` | `your_api_secret` |
| `JWT_SECRET` | `random_string` |
| `STRIPE_SECRET_KEY` | `sk_live_...` |

## 4. Verification
1. Wait for the build to finish.
2. Visit `https://your-app-name.onrender.com/health`.
3. You should see `{"status":"OK",...}`.

## 5. Mobile App Build (EAS)
1. Install EAS CLI: `npm install -g eas-cli`
2. Login: `eas login`
3. Configure `eas.json` (already in repo).
4. Run build:
   - Android: `eas build -p android --profile production`
   - iOS: `eas build -p ios --profile production`
