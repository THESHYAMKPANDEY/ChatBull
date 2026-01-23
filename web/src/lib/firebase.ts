import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, browserLocalPersistence, setPersistence, useDeviceLanguage } from 'firebase/auth';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

let app: FirebaseApp;
let auth: Auth;

try {
  if (!getApps().length) {
    app = initializeApp(config);
  } else {
    app = getApp();
  }
  auth = getAuth(app);
  setPersistence(auth, browserLocalPersistence).catch(() => undefined);
  try { useDeviceLanguage(auth); } catch {}
} catch {
  app = {} as FirebaseApp;
  auth = {} as Auth;
}

export { app, auth };
