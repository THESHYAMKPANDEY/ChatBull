import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  RecaptchaVerifier,
  signInWithCustomToken,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signOut,
} from 'firebase/auth';
import { auth } from '../config/firebase';

export type PhoneConfirmation = any;

let recaptchaVerifier: RecaptchaVerifier | null = null;

export const observeAuthState = (cb: (user: any) => void) => {
  return onAuthStateChanged(auth as any, cb);
};

export const signOutUser = async () => {
  await signOut(auth as any);
};

export const signInEmailPassword = async (email: string, password: string, isSignUp: boolean) => {
  return isSignUp
    ? await createUserWithEmailAndPassword(auth as any, email, password)
    : await signInWithEmailAndPassword(auth as any, email, password);
};

export const signInCustomToken = async (token: string) => {
  return await signInWithCustomToken(auth as any, token);
};

export const startPhoneOtp = async (phoneNumber: string, recaptchaContainerId: string) => {
  if (!recaptchaVerifier) {
    recaptchaVerifier = new RecaptchaVerifier(auth as any, recaptchaContainerId, { size: 'invisible' });
    await recaptchaVerifier.render();
  }
  return await signInWithPhoneNumber(auth as any, phoneNumber, recaptchaVerifier);
};

export const confirmPhoneOtp = async (confirmation: PhoneConfirmation, code: string) => {
  return await confirmation.confirm(code);
};

