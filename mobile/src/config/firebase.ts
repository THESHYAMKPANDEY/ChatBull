import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, initializeAuth, Auth } from 'firebase/auth';
const { getReactNativePersistence } = require('firebase/auth');
import AsyncStorage from '@react-native-async-storage/async-storage';
import { appConfig } from './appConfig';

const firebaseConfig = {
  apiKey: appConfig.FIREBASE_API_KEY,
  authDomain: appConfig.FIREBASE_AUTH_DOMAIN,
  projectId: appConfig.FIREBASE_PROJECT_ID,
  storageBucket: appConfig.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: appConfig.FIREBASE_MESSAGING_SENDER_ID,
  appId: appConfig.FIREBASE_APP_ID,
};

let app: FirebaseApp;
let auth: Auth;

try {
  const requiredKeys = [
    'FIREBASE_API_KEY',
    'FIREBASE_AUTH_DOMAIN',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_STORAGE_BUCKET',
    'FIREBASE_MESSAGING_SENDER_ID',
    'FIREBASE_APP_ID',
  ] as const;

  const missingKeys = requiredKeys.filter((k) => !appConfig[k]);
  if (missingKeys.length > 0 && process.env.NODE_ENV === 'production') {
    throw new Error(`Missing Firebase config: ${missingKeys.join(', ')}`);
  }

  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } else {
    app = getApp();
    auth = getAuth(app);
  }
} catch (error) {
  console.error("Firebase initialization error:", error);
  // Fallback for types
  app = {} as FirebaseApp;
  auth = {} as Auth;
}

export { app, auth };
