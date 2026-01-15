import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

let firebaseInitialized = false;

/**
 * Initialize Firebase Admin SDK
 * Reads service account from file path specified in FIREBASE_SERVICE_ACCOUNT_PATH
 */
export const initializeFirebaseAdmin = (): boolean => {
  if (firebaseInitialized) {
    return true;
  }

  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  if (!serviceAccountPath) {
    console.warn('⚠️  FIREBASE_SERVICE_ACCOUNT_PATH not set. Push notifications disabled.');
    return false;
  }

  try {
    const absolutePath = path.isAbsolute(serviceAccountPath)
      ? serviceAccountPath
      : path.join(process.cwd(), serviceAccountPath);

    if (!fs.existsSync(absolutePath)) {
      console.error(`❌ Firebase service account file not found: ${absolutePath}`);
      return false;
    }

    const serviceAccount = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    firebaseInitialized = true;
    console.log('✅ Firebase Admin SDK initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin:', error);
    return false;
  }
};

/**
 * Send push notification to a single device
 */
export const sendPushNotification = async (
  deviceToken: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  if (!firebaseInitialized) {
    return { success: false, error: 'Firebase Admin not initialized' };
  }

  try {
    const message: admin.messaging.Message = {
      token: deviceToken,
      notification: {
        title,
        body,
      },
      data: data || {},
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'chat_notifications',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    const response = await admin.messaging().send(message);
    console.log(`✅ Push notification sent: ${response}`);
    return { success: true, messageId: response };
  } catch (error: any) {
    console.error('❌ Push notification failed:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
};

/**
 * Send push notification to multiple devices
 */
export const sendPushNotificationToMultiple = async (
  deviceTokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<{ successCount: number; failureCount: number }> => {
  if (!firebaseInitialized) {
    return { successCount: 0, failureCount: deviceTokens.length };
  }

  if (deviceTokens.length === 0) {
    return { successCount: 0, failureCount: 0 };
  }

  try {
    const message: admin.messaging.MulticastMessage = {
      tokens: deviceTokens,
      notification: {
        title,
        body,
      },
      data: data || {},
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`✅ Multicast sent: ${response.successCount} success, ${response.failureCount} failed`);
    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (error) {
    console.error('❌ Multicast notification failed:', error);
    return { successCount: 0, failureCount: deviceTokens.length };
  }
};

/**
 * Check if Firebase Admin is initialized
 */
export const isFirebaseAdminReady = (): boolean => {
  return firebaseInitialized;
};
