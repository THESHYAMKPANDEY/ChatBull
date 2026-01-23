import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithCustomToken,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  UserCredential
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { Platform } from 'react-native';
let recaptchaWidgetId: any;

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
  if (Platform.OS === 'web') {
    try {
      // @ts-ignore
      if (process.env.NODE_ENV !== 'production' && (auth as any).settings) {
        // @ts-ignore
        (auth as any).settings.appVerificationDisabledForTesting = true;
      }
    } catch {}
    verifier = new RecaptchaVerifier(auth, 'sign-in-button', {
      size: 'invisible',
    });
    try {
      const id = await (verifier as any).render();
      recaptchaWidgetId = id;
    } catch {}
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

export const resetRecaptcha = () => {
  // @ts-ignore
  const grecaptcha = typeof window !== 'undefined' ? (window as any).grecaptcha : null;
  if (grecaptcha && recaptchaWidgetId) {
    try {
      grecaptcha.reset(recaptchaWidgetId);
    } catch {}
  }
};
