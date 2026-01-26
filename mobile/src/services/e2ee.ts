import { Platform } from 'react-native';
import EncryptedStorage from 'react-native-encrypted-storage';
import nacl from 'tweetnacl';
import util from 'tweetnacl-util';

const IDENTITY_KEY_STORAGE = 'chatbull_identity_keypair_v1';
const GROUP_KEY_PREFIX = 'chatbull_group_key_v1_';

export type IdentityKeyPair = {
  publicKey: string; // base64
  secretKey: string; // base64
};

const getStorageItem = async (key: string): Promise<string | null> => {
  if (Platform.OS === 'web') {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  return EncryptedStorage.getItem(key);
};

const setStorageItem = async (key: string, value: string): Promise<void> => {
  if (Platform.OS === 'web') {
    try {
      localStorage.setItem(key, value);
    } catch {}
    return;
  }
  await EncryptedStorage.setItem(key, value);
};

const removeStorageItem = async (key: string): Promise<void> => {
  if (Platform.OS === 'web') {
    try {
      localStorage.removeItem(key);
    } catch {}
    return;
  }
  await EncryptedStorage.removeItem(key);
};

const encodeBase64 = (bytes: Uint8Array) => util.encodeBase64(bytes);
const decodeBase64 = (value: string) => util.decodeBase64(value);
const encodeUtf8 = (value: string) => util.decodeUTF8(value);
const decodeUtf8 = (bytes: Uint8Array) => util.encodeUTF8(bytes);

export const getOrCreateIdentityKeypair = async (): Promise<IdentityKeyPair> => {
  const existing = await getStorageItem(IDENTITY_KEY_STORAGE);
  if (existing) {
    try {
      const parsed = JSON.parse(existing);
      if (parsed?.publicKey && parsed?.secretKey) {
        return parsed as IdentityKeyPair;
      }
    } catch {
      // fall through to regenerate
    }
  }

  const keyPair = nacl.box.keyPair();
  const pair: IdentityKeyPair = {
    publicKey: encodeBase64(keyPair.publicKey),
    secretKey: encodeBase64(keyPair.secretKey),
  };
  await setStorageItem(IDENTITY_KEY_STORAGE, JSON.stringify(pair));
  return pair;
};

export const getIdentityPublicKey = async (): Promise<string | null> => {
  const existing = await getStorageItem(IDENTITY_KEY_STORAGE);
  if (!existing) return null;
  try {
    const parsed = JSON.parse(existing);
    return parsed?.publicKey || null;
  } catch {
    return null;
  }
};

export const clearIdentityKeypair = async (): Promise<void> => {
  await removeStorageItem(IDENTITY_KEY_STORAGE);
};

export type EncryptedPayload = {
  v: number;
  t: 'dm' | 'group';
  ek?: string; // ephemeral public key (base64) for DM
  spk?: string; // sender identity public key (base64)
  nonce: string; // base64
  ct: string; // base64
  mt?: string; // optional message type (text/media)
};

export const encryptForRecipient = (plaintext: string, recipientPublicKeyBase64: string, senderPublicKeyBase64: string) => {
  const ephemeral = nacl.box.keyPair();
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const messageBytes = encodeUtf8(plaintext);
  const recipientPub = decodeBase64(recipientPublicKeyBase64);

  const boxed = nacl.box(messageBytes, nonce, recipientPub, ephemeral.secretKey);

  const payload: EncryptedPayload = {
    v: 1,
    t: 'dm',
    ek: encodeBase64(ephemeral.publicKey),
    spk: senderPublicKeyBase64,
    nonce: encodeBase64(nonce),
    ct: encodeBase64(boxed),
  };

  return payload;
};

export const decryptFromSender = (payload: EncryptedPayload, recipientSecretKeyBase64: string): string | null => {
  if (!payload?.ek || !payload?.nonce || !payload?.ct) return null;
  try {
    const nonce = decodeBase64(payload.nonce);
    const ciphertext = decodeBase64(payload.ct);
    const senderEphemeralPublicKey = decodeBase64(payload.ek);
    const recipientSecretKey = decodeBase64(recipientSecretKeyBase64);

    const opened = nacl.box.open(ciphertext, nonce, senderEphemeralPublicKey, recipientSecretKey);
    if (!opened) return null;
    return decodeUtf8(opened);
  } catch {
    return null;
  }
};

export const encryptGroupMessage = (plaintext: string, groupKeyBase64: string): EncryptedPayload => {
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const key = decodeBase64(groupKeyBase64);
  const messageBytes = encodeUtf8(plaintext);
  const boxed = nacl.secretbox(messageBytes, nonce, key);
  return {
    v: 1,
    t: 'group',
    nonce: encodeBase64(nonce),
    ct: encodeBase64(boxed),
  };
};

export const decryptGroupMessage = (payload: EncryptedPayload, groupKeyBase64: string): string | null => {
  try {
    const nonce = decodeBase64(payload.nonce);
    const ciphertext = decodeBase64(payload.ct);
    const key = decodeBase64(groupKeyBase64);
    const opened = nacl.secretbox.open(ciphertext, nonce, key);
    if (!opened) return null;
    return decodeUtf8(opened);
  } catch {
    return null;
  }
};

export const generateGroupKey = (): string => {
  const key = nacl.randomBytes(32);
  return encodeBase64(key);
};

export const encryptGroupKeyForMember = (
  groupKeyBase64: string,
  memberPublicKeyBase64: string,
  senderSecretKeyBase64: string
) => {
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const memberPub = decodeBase64(memberPublicKeyBase64);
  const senderSecret = decodeBase64(senderSecretKeyBase64);
  const groupKeyBytes = decodeBase64(groupKeyBase64);
  const boxed = nacl.box(groupKeyBytes, nonce, memberPub, senderSecret);

  return {
    encryptedKey: encodeBase64(boxed),
    nonce: encodeBase64(nonce),
  };
};

export const decryptGroupKeyFromSender = (
  encryptedKeyBase64: string,
  nonceBase64: string,
  senderPublicKeyBase64: string,
  recipientSecretKeyBase64: string
): string | null => {
  try {
    const nonce = decodeBase64(nonceBase64);
    const ciphertext = decodeBase64(encryptedKeyBase64);
    const senderPub = decodeBase64(senderPublicKeyBase64);
    const recipientSecret = decodeBase64(recipientSecretKeyBase64);
    const opened = nacl.box.open(ciphertext, nonce, senderPub, recipientSecret);
    if (!opened) return null;
    return encodeBase64(opened);
  } catch {
    return null;
  }
};

export const setGroupKey = async (groupId: string, groupKeyBase64: string) => {
  await setStorageItem(`${GROUP_KEY_PREFIX}${groupId}`, groupKeyBase64);
};

export const getGroupKey = async (groupId: string): Promise<string | null> => {
  return getStorageItem(`${GROUP_KEY_PREFIX}${groupId}`);
};

export const clearGroupKey = async (groupId: string) => {
  await removeStorageItem(`${GROUP_KEY_PREFIX}${groupId}`);
};
