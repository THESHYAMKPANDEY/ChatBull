
import { encryptMessage, decryptMessage, generateKeyPair, deriveKey, encodeBase64 } from '../encryption';
import * as Crypto from 'expo-crypto';

// Mock Crypto for tests since we are not in Expo environment
jest.mock('expo-crypto', () => ({
  digestStringAsync: jest.fn(async (algo, str) => {
    // Simple mock hash
    return 'mocked_hash_256_bit_' + str;
  }),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  getRandomValues: jest.fn((arr) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  })
}));

describe('Encryption Service (Military Grade)', () => {
  it('should generate valid key pairs', () => {
    const keys = generateKeyPair();
    expect(keys.publicKey).toBeDefined();
    expect(keys.secretKey).toBeDefined();
    expect(keys.publicKey.length).toBe(32);
    expect(keys.secretKey.length).toBe(32);
  });

  it('should encrypt and decrypt messages correctly', () => {
    const senderKeys = generateKeyPair();
    const receiverKeys = generateKeyPair();
    
    const message = 'Top Secret Payload';
    const receiverPubKeyBase64 = encodeBase64(receiverKeys.publicKey);
    
    // Encrypt
    const encrypted = encryptMessage(message, receiverPubKeyBase64, senderKeys.secretKey);
    
    expect(encrypted.ciphertext).toBeDefined();
    expect(encrypted.nonce).toBeDefined();
    expect(encrypted.ciphertext).not.toBe(message);
    
    // Decrypt
    const senderPubKeyBase64 = encodeBase64(senderKeys.publicKey);
    const decrypted = decryptMessage(encrypted, senderPubKeyBase64, receiverKeys.secretKey);
    
    expect(decrypted).toBe(message);
  });

  it('should fail to decrypt with wrong key', () => {
    const senderKeys = generateKeyPair();
    const receiverKeys = generateKeyPair();
    const wrongKeys = generateKeyPair();
    
    const message = 'Top Secret Payload';
    const receiverPubKeyBase64 = encodeBase64(receiverKeys.publicKey);
    
    const encrypted = encryptMessage(message, receiverPubKeyBase64, senderKeys.secretKey);
    
    const senderPubKeyBase64 = encodeBase64(senderKeys.publicKey);
    const decrypted = decryptMessage(encrypted, senderPubKeyBase64, wrongKeys.secretKey);
    
    expect(decrypted).toBeNull();
  });

  it('should derive keys using PBKDF2 simulation', async () => {
    const password = 'securepassword';
    const salt = 'randomsalt';
    
    const key1 = await deriveKey(password, salt);
    const key2 = await deriveKey(password, salt);
    
    expect(key1).toBe(key2);
    expect(key1).toContain('mocked_hash');
  });
});
