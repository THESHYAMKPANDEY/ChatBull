I have analyzed the current implementation of the Private Mode and identified the areas that need to be enhanced to meet "military-grade" security standards as requested.

### **Current Implementation Status**
*   **Encryption**: Uses `tweetnacl` (Curve25519XSalsa20Poly1305) for end-to-end encryption. This is good but you requested **AES-256**.
*   **Biometrics**: Implemented using `expo-local-authentication` but with weak fallbacks (pin code).
*   **Screenshot Prevention**: Basic AppState monitoring (alert on background). Not true prevention.
*   **Data Wiping**: Backend has a `/end` endpoint that deletes sessions and messages. Frontend has auto-clear timers.
*   **Memory**: Standard JS memory management (vulnerable to heap dumps).

### **Implementation Plan**

#### **Phase 1: Advanced Encryption (AES-256)**
I will upgrade the encryption layer in `mobile/src/services/encryption.ts` to use **AES-256-GCM** (via `expo-crypto` or `react-native-aes-crypto` if available, otherwise a robust JS implementation like `forge` or `crypto-js` with PBKDF2 key derivation).
*   **Key Derivation**: PBKDF2 with 100,000 iterations for master key.
*   **Session Keys**: Unique AES-256 keys for each chat session, rotated every 100 messages.

#### **Phase 2: Mobile Security Hardening**
I will enhance `mobile/src/screens/PrivateModeScreen.tsx` and `security.ts`:
1.  **Strict Biometrics**: Remove "device passcode" fallback. Require strict biometric authentication (FaceID/TouchID).
2.  **Failed Attempts**: Add a counter. If 3 failed biometric attempts -> Wipe local private keys and token.
3.  **Screenshot Prevention**: Since we can't block native screenshots fully in Expo Go without native code, I will implement a **Blur View** that activates immediately on `AppState` inactive/background, and I will add a "Hold to View" mechanism for messages so they aren't visible by default.
4.  **Clipboard**: Clear clipboard automatically 30s after copying sensitive data.

#### **Phase 3: Backend Security (AES-256 & Wiping)**
I will update `old_version/backend/src/routes/private.ts`:
1.  **Encrypted Storage**: Messages stored in MongoDB will be encrypted at rest using AES-256 (Server-side key).
2.  **Secure Wipe**: Overwrite data with random bits before deletion (though MongoDB journal might persist, this is best effort at app level).

#### **Phase 4: Feature Additions**
1.  **Secure Download Manager**: Encrypted local storage for downloaded files.
2.  **URL Sanitization**: Strip tracking parameters from shared links.

#### **Phase 5: Testing & Deployment**
1.  **Tests**: Write unit tests for the new AES encryption functions.
2.  **Deployment**: Update the `DEPLOY_GUIDE.md` with new security environment variables (`ENCRYPTION_KEY`, `SECURITY_LEVEL`).

### **Execution Steps**
1.  **Upgrade Encryption**: Modify `encryption.ts` to support AES-256.
2.  **Harden Mobile UI**: Update `PrivateModeScreen.tsx` (Biometrics, Hold-to-view).
3.  **Harden Backend**: Update `private.ts` (Encryption at rest).
4.  **Verify**: Run the new security tests.

Shall I proceed with **Phase 1: Upgrading Encryption to AES-256**?