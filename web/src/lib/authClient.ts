import { signInWithCustomToken, getIdToken, signOut } from 'firebase/auth';
import { auth } from './firebase';

export async function signInWithCustomTokenAndGetIdToken(customToken: string) {
  const userCredential = await signInWithCustomToken(auth, customToken);
  const idToken = await getIdToken(userCredential.user, true);
  return idToken;
}

export async function signOutUser() {
  await signOut(auth);
}
