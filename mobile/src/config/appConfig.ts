const fallbackApiBase = 'https://chatbull-backend.onrender.com';

const apiBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL || fallbackApiBase;

const socketBaseUrl =
  process.env.EXPO_PUBLIC_SOCKET_URL || apiBaseUrl;
const legalPrivacyUrl =
  process.env.EXPO_PUBLIC_LEGAL_PRIVACY_URL || `${apiBaseUrl}/api/legal/privacy`;

export const appConfig = {
  API_BASE_URL: apiBaseUrl,
  SOCKET_BASE_URL: socketBaseUrl,
  LEGAL_PRIVACY_URL: legalPrivacyUrl,
  FIREBASE_API_KEY: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};
