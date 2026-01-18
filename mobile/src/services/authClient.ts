import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithCustomToken,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  UserCredential
} from 'firebase/auth';
import { auth } from '../config/firebase';

export const signInEmailPassword = async (email: string, password: string, isSignUp: boolean): Promise<UserCredential> => {
  if (isSignUp) {
    return await createUserWithEmailAndPassword(auth, email, password);
  } else {
    return await signInWithEmailAndPassword(auth, email, password);
  }
};

export const signInCustomToken = async (token: string): Promise<UserCredential> => {
  return await signInWithCustomToken(auth, token);
};

export const startPhoneOtp = async (phoneNumber: string, recaptchaContainerId?: string) => {
  let verifier;
  if (recaptchaContainerId) {
    // Web
    verifier = new RecaptchaVerifier(auth, recaptchaContainerId, {
      'size': 'invisible',
    });
  }
  
  return await signInWithPhoneNumber(auth, phoneNumber, verifier);
};

export const confirmPhoneOtp = async (confirmationResult: any, code: string): Promise<UserCredential> => {
  return await confirmationResult.confirm(code);
};

export const getIdToken = async () => {
  if (!auth) return null;
  // @ts-ignore
  const user = auth.currentUser;
  if (!user) return null;
  return await user.getIdToken();
};

export const signOut = async () => {
  if (!auth) return;
  // @ts-ignore
  await auth.signOut();
};
