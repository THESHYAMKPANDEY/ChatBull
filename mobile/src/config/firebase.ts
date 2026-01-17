import { Platform } from 'react-native';
import { initializeApp, getApp } from 'firebase/app';
import { getAuth, initializeAuth } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

export const firebaseConfig = {
  apiKey:
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY ||
    'AIzaSyD5KYbRrN4rQl6tr7ogF5BwkzWBUa5nHYE',
  authDomain:
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    'social-chat-2df37.firebaseapp.com',
  projectId:
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'social-chat-2df37',
  storageBucket:
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    'social-chat-2df37.firebasestorage.app',
  messagingSenderId:
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '130500966218',
  appId:
    process.env.EXPO_PUBLIC_FIREBASE_APP_ID ||
    '1:130500966218:web:14a510344fdfb57251f3b3',
  measurementId: 'G-QXP5W7Z2JH',
};

let app;
try {
  app = getApp();
  console.log('🔄 Using existing Firebase app');
} catch (error) {
  console.log('🔧 Initializing new Firebase app...');
  app = initializeApp(firebaseConfig);
  console.log('✅ Firebase app initialized successfully');
}

console.log('🔧 Setting up Firebase Auth with persistence...');
let authInstance;

if (Platform.OS === 'web') {
  authInstance = getAuth(app);
} else {
  try {
    // Check if auth is already initialized
    authInstance = getAuth(app);
  } catch {
    const reactNativeAuth = require('firebase/auth');
    authInstance = initializeAuth(app, {
      persistence: reactNativeAuth.getReactNativePersistence(ReactNativeAsyncStorage),
    });
  }
}

export const auth = authInstance;
console.log('✅ Firebase Auth ready');

export { app };
console.log('✅ Firebase configuration loaded and ready');
