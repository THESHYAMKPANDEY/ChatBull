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
  signOut as signOutWeb,
  updateEmail,
  sendEmailVerification
} from 'firebase/auth';
import { auth as webAuth } from '../config/firebase';
import { Platform } from 'react-native';
import nativeAuth from '@react-native-firebase/auth';

let recaptchaWidgetId: any;

declare global {
  interface Window {
    recaptchaVerifier: any;
    grecaptcha: any;
  }
}

// Helper to get the correct auth instance
const getAuthInstance = () => {
  return Platform.OS === 'web' ? webAuth : nativeAuth();
};

export const signInEmailPassword = async (email: string, password: string, isSignUp: boolean): Promise<any> => {
  if (Platform.OS !== 'web') {
    if (isSignUp) {
      return await nativeAuth().createUserWithEmailAndPassword(email, password);
    } else {
      return await nativeAuth().signInWithEmailAndPassword(email, password);
    }
  }
  
  if (isSignUp) {
    return await createUserWithEmailAndPassword(webAuth, email, password);
  } else {
    return await signInWithEmailAndPassword(webAuth, email, password);
  }
};

export const signInCustomToken = async (token: string): Promise<any> => {
  if (Platform.OS !== 'web') {
    return await nativeAuth().signInWithCustomToken(token);
  }
  return await signInWithCustomToken(webAuth, token);
};

export const setupRecaptcha = (containerId: string, onSolved?: () => void) => {
  if (Platform.OS !== 'web') return null;
  
  try {
    // @ts-ignore
    if (process.env.NODE_ENV !== 'production' && (webAuth as any).settings) {
       // @ts-ignore
       (webAuth as any).settings.appVerificationDisabledForTesting = true;
    }

    // ROBUST CLEANUP: Clear DOM and Instance
    if (typeof document !== 'undefined') {
      const container = document.getElementById(containerId);
      if (container) {
        container.innerHTML = '';
      }
    }

    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
      } catch (e) {
        console.warn('Failed to clear existing verifier', e);
      }
      window.recaptchaVerifier = null;
    }

    // @ts-ignore
    window.recaptchaVerifier = new RecaptchaVerifier(webAuth, containerId, {
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

export const startPhoneOtp = async (phoneNumber: string, recaptchaContainerId?: string, existingVerifier?: any) => {
  // NATIVE: Use @react-native-firebase/auth
  if (Platform.OS !== 'web') {
    return await nativeAuth().signInWithPhoneNumber(phoneNumber);
  }

  // WEB: Use firebase/auth with reCAPTCHA
  let verifier = existingVerifier;
  if (!verifier) {
      // @ts-ignore
      verifier = window.recaptchaVerifier;
  }
  
  // If still no verifier, try to setup (lazy init)
  if (!verifier && recaptchaContainerId) {
     verifier = setupRecaptcha(recaptchaContainerId);
  }
  
  if (!verifier) {
    throw new Error("RecaptchaVerifier not initialized. Call setupRecaptcha first.");
  }
  
  return await signInWithPhoneNumber(webAuth, phoneNumber, verifier);
};

export const confirmPhoneOtp = async (confirmationResult: any, code: string): Promise<any> => {
  return await confirmationResult.confirm(code);
};

export const getIdToken = async () => {
  if (Platform.OS !== 'web') {
    const user = nativeAuth().currentUser;
    return user ? await user.getIdToken() : null;
  }

  if (!webAuth) return null;
  // @ts-ignore
  const user = webAuth.currentUser;
  if (!user) return null;
  return await user.getIdToken();
};

export const signOut = async () => {
  if (Platform.OS !== 'web') {
    await nativeAuth().signOut();
    return;
  }
  if (!webAuth) return;
  // @ts-ignore
  await signOutWeb(webAuth);
};

export const linkEmailPassword = async (email: string, password: string) => {
  // Handle Native
  if (Platform.OS !== 'web') {
    const user = nativeAuth().currentUser;
    if (!user) throw new Error('No user logged in');
    
    // 1. Update Email
    if (user.email !== email) {
      await user.updateEmail(email);
    }
    
    // 2. Link Credential
    try {
      const credential = nativeAuth.EmailAuthProvider.credential(email, password);
      await user.linkWithCredential(credential);
    } catch (e: any) {
       if (e.code === 'auth/provider-already-linked') {
         await user.updatePassword(password);
       } else {
         throw e;
       }
    }
    return;
  }

  // Handle Web
  if (!webAuth.currentUser) throw new Error('No user logged in');
  
  // 1. Update email on Firebase User (requires recent login)
  try {
     // @ts-ignore
     if (webAuth.currentUser.email !== email) {
        // @ts-ignore
        await updateEmail(webAuth.currentUser!, email);
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
     await linkWithCredential(webAuth.currentUser, credential);
  } catch (e: any) {
     if (e.code === 'auth/provider-already-linked') {
       // Just update password
       await updatePassword(webAuth.currentUser, password);
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

export const sendEmailVerificationLink = async () => {
  if (Platform.OS === 'web' && webAuth.currentUser) {
    // @ts-ignore
    await sendEmailVerification(webAuth.currentUser);
  } else if (Platform.OS !== 'web' && nativeAuth().currentUser) {
    await nativeAuth().currentUser?.sendEmailVerification();
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
