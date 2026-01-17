import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { verifyFirebaseToken } from '../middleware/auth';
import { validate } from '../middleware/validation';
import User from '../models/User';
import Story from '../models/Story';

const router = Router();

const createStoryValidationRules = [
  body('mediaUrl')
    .isString()
    .trim()
    .isURL()
    .withMessage('mediaUrl must be a valid URL'),
  body('mediaType')
    .isString()
    .trim()
    .isIn(['image', 'video'])
    .withMessage('mediaType must be image or video'),
];

router.get('/', verifyFirebaseToken, async (_req: Request, res: Response) => {
  try {
    const now = new Date();
    const stories = await Story.find({ expiresAt: { $gt: now } })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('author', 'displayName photoURL');

    res.status(200).json({ success: true, stories });
  } catch (error) {
    console.error('Get stories error:', error);
    res.status(500).json({ success: false, error: 'Failed to load stories' });
  }
});

router.post(
  '/',
  verifyFirebaseToken,
  createStoryValidationRules,
  validate,
  async (req: Request, res: Response) => {
    try {
      const firebaseUser = (res.locals as any).firebaseUser as { uid: string };
      const { mediaUrl, mediaType } = req.body as { mediaUrl: string; mediaType: 'image' | 'video' };

      const user = await User.findOne({ firebaseUid: firebaseUser.uid });
      if (!user) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const story = await Story.create({
        author: user._id,
        mediaUrl,
        mediaType,
        expiresAt,
      });

      await story.populate('author', 'displayName photoURL');

      res.status(201).json({ success: true, story });
    } catch (error) {
      console.error('Create story error:', error);
      res.status(500).json({ success: false, error: 'Failed to create story' });
    }
  }
);

export default router;

