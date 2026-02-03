const base = require("./app.json");

module.exports = () => {
  const expo = base.expo || {};
  const android = expo.android || {};
  const googleServicesFile = process.env.GOOGLE_SERVICES_JSON;

  // Inject EXPO_PUBLIC_* at build time for web/SSG
  const publicEnv = {
    EXPO_PUBLIC_FIREBASE_API_KEY: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    EXPO_PUBLIC_FIREBASE_PROJECT_ID: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    EXPO_PUBLIC_FIREBASE_APP_ID: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
    EXPO_PUBLIC_SOCKET_URL: process.env.EXPO_PUBLIC_SOCKET_URL,
  };

  const extra = {
    ...(expo.extra || {}),
    ...Object.fromEntries(Object.entries(publicEnv).filter(([, v]) => v)),
  };

  return {
    ...expo,
    extra,
    android: {
      ...android,
      ...(googleServicesFile ? { googleServicesFile } : {}),
    },
  };
};
