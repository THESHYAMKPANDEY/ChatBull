import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, initializeAuth, Auth } from 'firebase/auth';
// @ts-ignore - This import path is valid for React Native but TS might not resolve it without specific config
import { getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { appConfig } from './appConfig';

// Fallback config if env vars are missing (development only)
const firebaseConfig = {
  apiKey: appConfig.FIREBASE_API_KEY || "AIzaSyDummyKey",
  authDomain: appConfig.FIREBASE_AUTH_DOMAIN || "chatbull.firebaseapp.com",
  projectId: appConfig.FIREBASE_PROJECT_ID || "chatbull",
  storageBucket: appConfig.FIREBASE_STORAGE_BUCKET || "chatbull.appspot.com",
  messagingSenderId: appConfig.FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: appConfig.FIREBASE_APP_ID || "1:123456789:web:abcdef",
};

let app: FirebaseApp;
let auth: Auth;

try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    // @ts-ignore - getReactNativePersistence type signature might differ in some versions but works at runtime
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
