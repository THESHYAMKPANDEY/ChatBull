import { Router, Request, Response } from 'express';
import Follow from '../models/Follow';
import User from '../models/User';
import { verifyFirebaseToken } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

const getCurrentUser = async (res: Response) => {
  const firebaseUser = (res.locals as any).firebaseUser as { uid: string };
  return User.findOne({ firebaseUid: firebaseUser.uid });
};

router.post('/:userId', verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const me = await getCurrentUser(res);
    if (!me) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const targetId = req.params.userId;
    if (!targetId || String(me._id) === String(targetId)) {
      res.status(400).json({ error: 'Invalid target user' });
      return;
    }

    await Follow.updateOne(
      { follower: me._id, following: targetId },
      { follower: me._id, following: targetId },
      { upsert: true }
    );

    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Follow error', { message: (error as any)?.message || String(error) });
    res.status(500).json({ error: 'Failed to follow user' });
  }
});

router.delete('/:userId', verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const me = await getCurrentUser(res);
    if (!me) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const targetId = req.params.userId;
    await Follow.deleteOne({ follower: me._id, following: targetId });
    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Unfollow error', { message: (error as any)?.message || String(error) });
    res.status(500).json({ error: 'Failed to unfollow user' });
  }
});

router.get('/followers/:userId?', verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const me = await getCurrentUser(res);
    if (!me) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const userId = req.params.userId || String(me._id);
    const followers = await Follow.find({ following: userId })
      .populate('follower', 'displayName email photoURL username phoneNumber')
      .limit(200);
    res.status(200).json({
      users: followers.map((f) => (f as any).follower),
    });
  } catch (error) {
    logger.error('Get followers error', { message: (error as any)?.message || String(error) });
    res.status(500).json({ error: 'Failed to load followers' });
  }
});

router.get('/following/:userId?', verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const me = await getCurrentUser(res);
    if (!me) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const userId = req.params.userId || String(me._id);
    const following = await Follow.find({ follower: userId })
      .populate('following', 'displayName email photoURL username phoneNumber')
      .limit(200);
    res.status(200).json({
      users: following.map((f) => (f as any).following),
    });
  } catch (error) {
    logger.error('Get following error', { message: (error as any)?.message || String(error) });
    res.status(500).json({ error: 'Failed to load following' });
  }
});

router.get('/counts/:userId?', verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const me = await getCurrentUser(res);
    if (!me) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const userId = req.params.userId || String(me._id);
    const [followers, following] = await Promise.all([
      Follow.countDocuments({ following: userId }),
      Follow.countDocuments({ follower: userId }),
    ]);
    res.status(200).json({ followers, following });
  } catch (error) {
    logger.error('Get follow counts error', { message: (error as any)?.message || String(error) });
    res.status(500).json({ error: 'Failed to load counts' });
  }
});

router.get('/status/:userId', verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const me = await getCurrentUser(res);
    if (!me) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const targetId = req.params.userId;
    const exists = await Follow.exists({ follower: me._id, following: targetId });
    res.status(200).json({ isFollowing: !!exists });
  } catch (error) {
    logger.error('Follow status error', { message: (error as any)?.message || String(error) });
    res.status(500).json({ error: 'Failed to load follow status' });
  }
});

export default router;
