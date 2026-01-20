import { Router, Request, Response } from 'express';
import User from '../models/User';
import Message from '../models/Message';
import PrivateMessage from '../models/PrivateMessage';
import { profileUpdateValidationRules, validate } from '../middleware/validation';
import { verifyFirebaseToken } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/legal/privacy
 * Serve privacy policy as HTML for browsers/Google Play, or JSON for API clients
 */
router.get('/privacy', (req: Request, res: Response) => {
  const isBrowser = req.headers.accept?.includes('text/html');
  
  const privacyContent = `
# Privacy Policy for ChatBull

**Last updated:** January 14, 2026

## Information We Collect

We collect the following information when you use our app:

- **Account Information:** Email address, display name, profile picture
- **Chat Data:** Messages sent and received through our service
- **Device Information:** Device type, operating system, unique device identifiers
- **Usage Data:** Information about how you use the app

## How We Use Your Information

We use your information to:

- Provide and improve our chat services
- Authenticate your account
- Send push notifications (with your consent)
- Maintain security and prevent fraud
- Comply with legal obligations

## Data Storage and Security

- Your data is stored securely on our servers
- We use industry-standard security measures
- Your messages are encrypted in transit
- Private mode messages are automatically deleted after 24 hours

## Your Rights

You have the right to:

- Access your personal data
- Update or correct inaccurate data
- Delete your account and associated data
- Opt-out of non-essential communications

## Data Retention

- Regular chat messages are retained according to our business needs
- Private mode messages are automatically deleted after 24 hours
- Upon account deletion, your personal data is permanently removed within 30 days

## Contact Us

If you have questions about this privacy policy, please contact us at:

Email: privacy@chatbull.com
  `;

  if (isBrowser) {
    // Serve nice HTML for Google Play / Browsers
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Privacy Policy - ChatBull</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #007AFF; border-bottom: 2px solid #eee; padding-bottom: 10px; }
          h2 { color: #444; margin-top: 30px; }
          ul { padding-left: 20px; }
          li { margin-bottom: 8px; }
          strong { color: #000; }
        </style>
      </head>
      <body>
        ${privacyContent.replace(/\n/g, '<br/>').replace(/# (.*)/, '<h1>$1</h1>').replace(/## (.*)/g, '<h2>$1</h2>').replace(/- \*\*(.*)\*\*: (.*)/g, '<li><strong>$1</strong>: $2</li>').replace(/- (.*)/g, '<li>$1</li>')}
      </body>
      </html>
    `;
    res.send(html);
  } else {
    // Serve JSON for Mobile App
    res.status(200).json({
      title: 'Privacy Policy',
      content: privacyContent,
      lastUpdated: '2026-01-14',
    });
  }
});

/**
 * DELETE /api/legal/me
 * Delete user account and all associated data (legal alias for /api/user/me)
 * Requires user authentication
 */
router.delete('/me', verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const firebaseUser = (res.locals as any).firebaseUser as { uid: string };
    const firebaseUid = firebaseUser.uid;

    // Find user
    const user = await User.findOne({ firebaseUid });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Mark user as deleted (soft delete)
    user.isDeleted = true;
    user.deletedAt = new Date();
    await user.save();

    // Delete all messages associated with this user (both as sender and receiver)
    await Message.deleteMany({
      $or: [{ sender: user._id }, { receiver: user._id }],
    });

    // Delete all private messages associated with this user
    await PrivateMessage.deleteMany({
      $or: [
        { senderAlias: user.displayName },
        { receiverAlias: user.displayName },
      ],
    });

    // Actually delete the user record
    await User.deleteOne({ firebaseUid });

    res.status(200).json({
      message: 'Account and all associated data deleted successfully',
      deletedAt: new Date(),
    });
  } catch (error) {
    logger.error('Delete account error', { message: (error as any)?.message || String(error) });
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

/**
 * PUT /api/legal/me
 * Update user profile (legal alias for /api/user/me)
 */
router.put(
  '/me',
  verifyFirebaseToken,
  profileUpdateValidationRules(),
  validate,
  async (req: Request, res: Response) => {
    try {
      const firebaseUser = (res.locals as any).firebaseUser as { uid: string };
      const firebaseUid = firebaseUser.uid;
      const { displayName, photoURL, phoneNumber } = req.body;

      const user = await User.findOne({ firebaseUid });
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Update fields if provided
      if (displayName) user.displayName = displayName;
      if (photoURL) user.photoURL = photoURL;
      if (phoneNumber) user.phoneNumber = phoneNumber;

      await user.save();

      res.status(200).json({
        message: 'Profile updated successfully',
        user: {
          id: user._id,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          phoneNumber: user.phoneNumber,
        },
      });
    } catch (error) {
      logger.error('Update profile error', { message: (error as any)?.message || String(error) });
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }
);

export default router;
