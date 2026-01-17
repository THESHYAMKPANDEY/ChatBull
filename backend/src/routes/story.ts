import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { verifyFirebaseToken } from '../middleware/auth';
import { validate } from '../middleware/validation';
import Story from '../models/Story';
import User from '../models/User';

const router = Router();

const storyValidationRules = [
  body('mediaUrl')
    .isURL()
    .withMessage('Media URL must be a valid URL'),
  body('mediaType')
    .isIn(['image', 'video'])
    .withMessage('Media type must be image or video'),
];

router.get('/', verifyFirebaseToken, async (_req: Request, res: Response) => {
  try {
    const firebaseUser = (res.locals as any).firebaseUser as { uid: string };
    const user = await User.findOne({ firebaseUid: firebaseUser.uid });
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const stories = await Story.find({ expiresAt: { $gt: new Date() } })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('author', 'displayName photoURL');

    res.status(200).json({ success: true, stories });
  } catch (error) {
    console.error('Get stories error:', error);
    res.status(500).json({ success: false, error: 'Failed to load stories' });
  }
});

router.post('/', verifyFirebaseToken, storyValidationRules, validate, async (req: Request, res: Response) => {
  try {
    const firebaseUser = (res.locals as any).firebaseUser as { uid: string };
    const user = await User.findOne({ firebaseUid: firebaseUser.uid });
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const { mediaUrl, mediaType } = req.body as { mediaUrl: string; mediaType: 'image' | 'video' };

    const story = await Story.create({
      author: user._id,
      mediaUrl,
      mediaType,
    });

    await story.populate('author', 'displayName photoURL');

    res.status(201).json({ success: true, story });
  } catch (error) {
    console.error('Create story error:', error);
    res.status(500).json({ success: false, error: 'Failed to create story' });
  }
});

export default router;
