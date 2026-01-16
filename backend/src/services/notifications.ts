import admin from 'firebase-admin';

// Remove top-level check that runs before initialization
// if (!admin.apps.length) {
//   console.warn("⚠️ FCM not configured (Firebase not initialized)");
// }

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
      console.warn(
        '⚠️  Firebase Admin not configured. For cloud deployments (Render, Heroku, etc.), set FIREBASE_SERVICE_ACCOUNT_JSON environment variable with the full JSON content as a single-line string. Push notifications will be disabled until configured.'
      );
      return false;
    }

    const serviceAccount = JSON.parse(serviceAccountJson);
    
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
