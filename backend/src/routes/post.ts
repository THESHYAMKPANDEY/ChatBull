import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import Post from '../models/Post';
import User from '../models/User';
import { verifyFirebaseToken } from '../middleware/auth';
import { validate } from '../middleware/validation';

const router = Router();

const postValidationRules = [
  body('content')
    .optional() // Allow optional content if media is present
    .trim(),
  body('mediaUrl')
    .optional()
    .isURL()
    .withMessage('Media URL must be a valid URL'),
  body('mediaType')
    .optional()
    .isIn(['image', 'video', 'file'])
    .withMessage('Media type must be image, video, or file'),
  body().custom((value, { req }) => {
    if (!req.body.content && !req.body.mediaUrl) {
      throw new Error('Post must have either content or media');
    }
    return true;
  }),
];

/**
 * POST /api/posts
 * Create a new post
 * Body: { content: string, mediaUrl?: string, mediaType?: 'image' | 'video' | 'file' }
 */
router.post(
  '/',
  verifyFirebaseToken,
  postValidationRules,
  validate,
  async (req: Request, res: Response) => {
    try {
      const firebaseUser = (res.locals as any).firebaseUser as { uid: string };
      const { content, mediaUrl, mediaType } = req.body;

      const user = await User.findOne({ firebaseUid: firebaseUser.uid });
      if (!user) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }

      const post = await Post.create({
        author: user._id,
        content: content || '', // Allow empty content
        mediaUrl: mediaUrl || '',
        mediaType,
      });

      await post.populate('author', 'displayName photoURL');

      res.status(201).json({
        success: true,
        post,
      });
    } catch (error) {
      console.error('Create post error:', error);
      res.status(500).json({ success: false, error: 'Failed to create post' });
    }
  }
);

/**
 * GET /api/posts/feed
 * Get global feed (all posts), paginated
 * Query params: page (default 1), limit (default 20)
 */
router.get('/feed', verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const page = Math.max(parseInt((req.query.page as string) || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt((req.query.limit as string) || '20', 10), 1), 50);
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      Post.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('author', 'displayName photoURL'),
      Post.countDocuments(),
    ]);

    res.status(200).json({
      success: true,
      page,
      limit,
      total,
      posts,
    });
  } catch (error) {
    console.error('Get feed error:', error);
    res.status(500).json({ success: false, error: 'Failed to load feed' });
  }
});

export default router;
