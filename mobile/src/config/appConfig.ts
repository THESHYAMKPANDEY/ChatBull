const fallbackApiBase = 'http://192.168.1.17:5000';

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
};
