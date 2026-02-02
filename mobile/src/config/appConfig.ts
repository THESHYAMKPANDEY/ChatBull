import Constants from 'expo-constants';

const fallbackApiBase = 'https://chatbull-backend.onrender.com';

const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || fallbackApiBase;
const socketBaseUrl = process.env.EXPO_PUBLIC_SOCKET_URL || apiBaseUrl;
const legalPrivacyUrl =
  process.env.EXPO_PUBLIC_LEGAL_PRIVACY_URL || `${apiBaseUrl}/api/legal/privacy`;

const expoExtra = Constants.expoConfig?.extra ?? {};
const getConfigValue = (key: string) =>
  process.env[key as keyof NodeJS.ProcessEnv] || (expoExtra as Record<string, string | undefined>)[key];

export const appConfig = {
  API_BASE_URL: apiBaseUrl,
  SOCKET_BASE_URL: socketBaseUrl,
  LEGAL_PRIVACY_URL: legalPrivacyUrl,
  FIREBASE_API_KEY: getConfigValue('EXPO_PUBLIC_FIREBASE_API_KEY'),
  FIREBASE_AUTH_DOMAIN: getConfigValue('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN'),
  FIREBASE_PROJECT_ID: getConfigValue('EXPO_PUBLIC_FIREBASE_PROJECT_ID'),
  FIREBASE_STORAGE_BUCKET: getConfigValue('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET'),
  FIREBASE_MESSAGING_SENDER_ID: getConfigValue('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
  FIREBASE_APP_ID: getConfigValue('EXPO_PUBLIC_FIREBASE_APP_ID'),
};
