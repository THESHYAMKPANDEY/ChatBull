import admin from 'firebase-admin';
import { logger } from '../utils/logger';

let firebaseInitialized = false;

/**
 * Initialize Firebase Admin SDK
 * In production:
 * - Use FIREBASE_SERVICE_ACCOUNT_JSON (full JSON as env var)
 */
export const initializeFirebaseAdmin = (): boolean => {
  if (firebaseInitialized) {
    return true;
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  
  try {
    if (!serviceAccountJson) {
      logger.warn('Firebase Admin not configured');
      return false;
    }

    const serviceAccount = JSON.parse(serviceAccountJson);
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    firebaseInitialized = true;
    logger.info('Firebase Admin SDK initialized successfully');
    return true;
  } catch (error) {
    logger.error('Failed to initialize Firebase Admin', { message: (error as any)?.message || String(error) });
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
    logger.info('Push notification sent', { messageId: response });
    return { success: true, messageId: response };
  } catch (error: any) {
    logger.error('Push notification failed', { message: error?.message || String(error) });
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
    logger.info('Multicast sent', { successCount: response.successCount, failureCount: response.failureCount });
    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (error) {
    logger.error('Multicast notification failed', { message: (error as any)?.message || String(error) });
    return { successCount: 0, failureCount: deviceTokens.length };
  }
};

/**
 * Check if Firebase Admin is initialized
 */
export const isFirebaseAdminReady = (): boolean => {
  return firebaseInitialized;
};
