import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithCustomToken,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  UserCredential,
  updatePassword,
  EmailAuthProvider,
  linkWithCredential,
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { Platform } from 'react-native';
let recaptchaWidgetId: any;

declare global {
  interface Window {
    recaptchaVerifier: any;
    grecaptcha: any;
  }
}

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

export const setupRecaptcha = (containerId: string, onSolved?: () => void) => {
  if (Platform.OS !== 'web') return null;
  
  try {
    // @ts-ignore
    if (process.env.NODE_ENV !== 'production' && (auth as any).settings) {
       // @ts-ignore
       (auth as any).settings.appVerificationDisabledForTesting = true;
    }

    // Clear existing if needed (optional)
    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
      } catch {}
    }

    // @ts-ignore
    window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      'size': 'invisible',
      'callback': (response: any) => {
        if (onSolved) onSolved();
      }
    });

    // Render to get widget ID for reset
    (window.recaptchaVerifier as any).render().then((id: any) => {
        recaptchaWidgetId = id;
    });

    return window.recaptchaVerifier;
  } catch (error) {
    console.error("Recaptcha setup failed", error);
    return null;
  }
};

export const startPhoneOtp = async (phoneNumber: string, recaptchaContainerId?: string) => {
  let verifier;
  if (Platform.OS === 'web') {
    // Use the global verifier if available, or try to create one if containerId is provided
    // @ts-ignore
    verifier = window.recaptchaVerifier;
    
    if (!verifier && recaptchaContainerId) {
       verifier = setupRecaptcha(recaptchaContainerId);
    }
    
    if (!verifier) {
      throw new Error("RecaptchaVerifier not initialized. Call setupRecaptcha first.");
    }
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

export const linkEmailPassword = async (email: string, password: string) => {
  if (!auth.currentUser) throw new Error('No user logged in');
  
  // 1. Update email on Firebase User (requires recent login)
  try {
     // @ts-ignore
     if (auth.currentUser.email !== email) {
        // @ts-ignore
        await import('firebase/auth').then(m => m.updateEmail(auth.currentUser!, email));
     }
  } catch (e: any) {
    if (e.code === 'auth/requires-recent-login') {
       throw new Error('Please log out and log in again to set email.');
    }
    throw e;
  }

  // 2. Link credential (or update password if email provider exists)
  try {
     const credential = EmailAuthProvider.credential(email, password);
     await linkWithCredential(auth.currentUser, credential);
  } catch (e: any) {
     if (e.code === 'auth/provider-already-linked') {
       // Just update password
       await updatePassword(auth.currentUser, password);
     } else if (e.code === 'auth/credential-already-in-use') {
       throw new Error('This email is already associated with another account.');
     } else {
       throw e;
     }
  }
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

export const clearRecaptcha = () => {
  if (Platform.OS !== 'web') return;
  // @ts-ignore
  if (typeof window !== 'undefined' && window.recaptchaVerifier) {
    try {
      // @ts-ignore
      window.recaptchaVerifier.clear();
    } catch (e) {
      console.warn("Failed to clear recaptcha", e);
    }
    // @ts-ignore
    window.recaptchaVerifier = null;
  }
  recaptchaWidgetId = null;
};
