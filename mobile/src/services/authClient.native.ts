import { auth } from '../config/firebase';

export type PhoneConfirmation = any;

export const observeAuthState = (cb: (user: any) => void) => {
  return auth.onAuthStateChanged(cb);
};

export const signOutUser = async () => {
  await auth.signOut();
};

export const signInEmailPassword = async (email: string, password: string, isSignUp: boolean) => {
  return isSignUp
    ? await auth.createUserWithEmailAndPassword(email, password)
    : await auth.signInWithEmailAndPassword(email, password);
};

export const signInCustomToken = async (token: string) => {
  return await auth.signInWithCustomToken(token);
};

export const startPhoneOtp = async (phoneNumber: string) => {
  return await auth.signInWithPhoneNumber(phoneNumber);
};

export const confirmPhoneOtp = async (confirmation: PhoneConfirmation, code: string) => {
  return await confirmation.confirm(code);
};

