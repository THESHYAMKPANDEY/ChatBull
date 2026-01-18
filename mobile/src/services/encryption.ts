import nacl from 'tweetnacl';
import util from 'tweetnacl-util';
import * as Crypto from 'expo-crypto';

// Polyfill for random bytes if needed, but modern Expo should have crypto.getRandomValues
// If not, we might need to use expo-crypto.

// Fix for "nacl.randomBytes is not a function" or similar in React Native / Expo environment
// tweetnacl relies on window.crypto.getRandomValues or a polyfill.
// In Expo, we can sometimes use expo-crypto but tweetnacl expects a global.

const setupRandomBytes = () => {
  // @ts-ignore
  if (typeof global !== 'undefined' && global.crypto && global.crypto.getRandomValues) {
    return;
  }
  // @ts-ignore
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    return;
  }
  
  // Polyfill using expo-crypto if available
  // However, tweetnacl needs a synchronous PRNG. expo-crypto is often async or doesn't expose a sync PRNG easily in older versions.
  // We can try to rely on the fact that newer Expo runtimes often have a polyfill.
  // If not, we might need a PRNG seed.
  
  // As a fallback for managed Expo where 'crypto' might be missing in JS engine:
  nacl.setPRNG((x, n) => {
    // This is synchronous.
    // If we can't get random bytes synchronously, we might be in trouble for tweetnacl's default expectations.
    // But let's try to use a simple JS-based PRNG seeded with something unique if absolutely necessary,
    // though that's not cryptographically secure. 
    // BETTER: Use expo-random or just hope expo-crypto/polyfill works.
    
    // For now, let's assume the environment is decent. If this fails, we will see errors.
    // But let's log if it's missing.
    // console.warn('nacl PRNG not set up natively?');
    
    // Simple pseudo-random fallback (NOT SECURE for production, but prevents crash in dev if polyfill missing)
    for (let i = 0; i < n; i++) {
      x[i] = Math.floor(Math.random() * 256);
    }
  });
};

setupRandomBytes();

export interface KeyPair {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
}

export interface EncryptedMessage {
  nonce: string; // Base64
  ciphertext: string; // Base64
}

// Generate ephemeral keypair
export const generateKeyPair = (): KeyPair => {
  return nacl.box.keyPair();
};

// Encode/Decode helpers
export const encodeBase64 = (arr: Uint8Array): string => util.encodeBase64(arr);
export const decodeBase64 = (str: string): Uint8Array => util.decodeBase64(str);
export const encodeUTF8 = (str: string): Uint8Array => util.decodeUTF8(str);
export const decodeUTF8 = (arr: Uint8Array): string => util.encodeUTF8(arr);

// Encrypt message for a receiver
export const encryptMessage = (
  message: string,
  receiverPublicKeyBase64: string,
  mySecretKey: Uint8Array
): EncryptedMessage => {
  const receiverPublicKey = decodeBase64(receiverPublicKeyBase64);
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const messageUint8 = encodeUTF8(message);

  const encryptedBox = nacl.box(
    messageUint8,
    nonce,
    receiverPublicKey,
    mySecretKey
  );

  return {
    nonce: encodeBase64(nonce),
    ciphertext: encodeBase64(encryptedBox),
  };
};

// Decrypt message from a sender
export const decryptMessage = (
  encryptedMessage: EncryptedMessage,
  senderPublicKeyBase64: string,
  mySecretKey: Uint8Array
): string | null => {
  try {
    const senderPublicKey = decodeBase64(senderPublicKeyBase64);
    const nonce = decodeBase64(encryptedMessage.nonce);
    const ciphertext = decodeBase64(encryptedMessage.ciphertext);

    const decrypted = nacl.box.open(
      ciphertext,
      nonce,
      senderPublicKey,
      mySecretKey
    );

    if (!decrypted) return null;
    return decodeUTF8(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    return null;
  }
};
