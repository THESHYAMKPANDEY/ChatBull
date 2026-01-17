import { Router, Request, Response } from 'express';
import User from '../models/User';
import { sendPushNotification, isFirebaseAdminReady } from '../services/notifications';
import { notificationValidationRules, validate } from '../middleware/validation';
import { verifyFirebaseToken } from '../middleware/auth';

const router = Router();

/**
 * POST /api/test/notify
 * Test push notification endpoint
 * Body: { userId, title, body }
 */
router.post('/notify', verifyFirebaseToken, notificationValidationRules(), validate, async (req: Request, res: Response) => {
  try {
    const { title, body } = req.body;

    if (!title || !body) {
      res.status(400).json({ 
        error: 'Missing required fields: title, body' 
      });
      return;
    }

    // Check if Firebase Admin is ready
    if (!isFirebaseAdminReady()) {
      res.status(503).json({ 
        error: 'Push notifications not configured. FIREBASE_SERVICE_ACCOUNT_JSON not set.' 
      });
      return;
    }

    const firebaseUser = (res.locals as any).firebaseUser;
    const user = await User.findOne({ firebaseUid: firebaseUser?.uid });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (!user.deviceToken) {
      res.status(400).json({ 
        error: 'User has no device token registered',
        hint: 'User needs to register device token from mobile app'
      });
      return;
    }

    // Send notification
    const result = await sendPushNotification(user.deviceToken, title, body);

    if (result.success) {
      res.status(200).json({ 
        message: 'Notification sent successfully',
        messageId: result.messageId
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to send notification',
        details: result.error
      });
    }
  } catch (error: any) {
    console.error('Test notify error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * POST /api/test/register-token
 * Register device token for a user (for testing)
 * Body: { firebaseUid, deviceToken }
 */
router.post('/register-token', verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const { deviceToken } = req.body;
    const firebaseUser = (res.locals as any).firebaseUser;

    if (!deviceToken) {
      res.status(400).json({ 
        error: 'Missing required fields: deviceToken' 
      });
      return;
    }

    const user = await User.findOneAndUpdate(
      { firebaseUid: firebaseUser?.uid },
      { deviceToken },
      { new: true }
    );

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.status(200).json({ 
      message: 'Device token registered successfully',
      userId: user._id
    });
  } catch (error: any) {
    console.error('Register token error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * GET /api/test/fcm-status
 * Check FCM configuration status
 */
router.get('/fcm-status', (req: Request, res: Response) => {
  const ready = isFirebaseAdminReady();
  res.status(200).json({
    fcmEnabled: ready,
    message: ready 
      ? 'Firebase Cloud Messaging is configured and ready' 
      : 'FCM not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON in .env'
  });
});

export default router;
