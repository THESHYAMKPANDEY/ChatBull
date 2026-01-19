# ChatBull Deployment Checklist

## Backend (Render)

Ensure the following Environment Variables are set in your Render Service Dashboard:

### Core
- `NODE_ENV`: `production`
- `PORT`: `10000` (or whatever Render assigns)
- `API_URL`: The URL of your backend (e.g., `https://chatbull-backend.onrender.com`). Used for Share Links.

### Database
- `MONGODB_URI`: Your MongoDB Connection String (e.g., from MongoDB Atlas).

### Storage (Cloudinary)
*Required for media uploads to work.*
- `CLOUDINARY_CLOUD_NAME`: Your Cloud Name
- `CLOUDINARY_API_KEY`: Your API Key
- `CLOUDINARY_API_SECRET`: Your API Secret

### Authentication (Firebase)
- `FIREBASE_SERVICE_ACCOUNT_JSON`: The **content** of your `serviceAccountKey.json` file. Paste the entire JSON object as the value.

### Security
- `CORS_ORIGINS`: Comma-separated list of allowed origins.
  - Example: `*` (Allow all - easiest for mobile apps)
  - Or: `http://localhost:19006` (for local dev)

---

## Mobile App (Expo / EAS)

Before building your mobile app (`eas build`), ensure these variables are in your `.env` file or EAS Secrets:

### API Connection
- `EXPO_PUBLIC_API_BASE_URL`: The URL of your deployed backend (e.g., `https://chatbull-backend.onrender.com`).

### Firebase Client Config
*Get these from your Firebase Console > Project Settings > General > Your Apps > Web App*
- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`

## Troubleshooting

- **Uploads failing?** Check Cloudinary credentials.
- **App crashing on launch?** Ensure you rebuilt the app (`eas build`) after the latest `app.json` changes (permissions were added).
- **Share links broken?** Ensure `API_URL` is set correctly on the backend.
