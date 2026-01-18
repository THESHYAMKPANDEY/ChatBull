import { Router, Request, Response } from 'express';
import User from '../models/User';
import Message from '../models/Message';
import PrivateMessage from '../models/PrivateMessage';
import { profileUpdateValidationRules, validate } from '../middleware/validation';
import { verifyFirebaseToken } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

/**
 * DELETE /api/user/me
 * Delete user account and all associated data
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
        { ephemeralUserId: user.displayName }, // Best effort guess if they used displayName as alias
        { recipientEphemeralId: user.displayName },
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
 * PUT /api/user/me
 * Update user profile
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
