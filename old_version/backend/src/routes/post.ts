import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import Post from '../models/Post';
import User from '../models/User';
import Comment from '../models/Comment';
import { verifyFirebaseToken } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { logger } from '../utils/logger';

const router = Router();

const postValidationRules = [
  body('content')
    .optional({ checkFalsy: true }) // Allow optional content if media is present
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Post content must be 0-1000 characters'),
  body('mediaUrl')
    .optional({ checkFalsy: true })
    .isURL()
    .withMessage('Media URL must be a valid URL'),
  body('mediaType')
    .optional({ checkFalsy: true })
    .isIn(['image', 'video', 'file'])
    .withMessage('Media type must be image, video, or file'),
  body().custom((value, { req }) => {
    const bodyValue = (req.body ?? {}) as { content?: unknown; mediaUrl?: unknown; mediaType?: unknown };
    const content = typeof bodyValue.content === 'string' ? bodyValue.content.trim() : '';
    const mediaUrl = typeof bodyValue.mediaUrl === 'string' ? bodyValue.mediaUrl.trim() : '';
    const mediaType = typeof bodyValue.mediaType === 'string' ? bodyValue.mediaType.trim() : '';

    if (!content && !mediaUrl) {
      throw new Error('Post must have either content or media');
    }
    if (mediaUrl && !mediaType) {
      throw new Error('Media type is required when mediaUrl is provided');
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
      logger.error('Create post error', { message: (error as any)?.message || String(error) });
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
    const firebaseUser = (res.locals as any).firebaseUser as { uid: string };
    const user = await User.findOne({ firebaseUid: firebaseUser.uid });
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

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

    const mappedPosts = posts.map((p: any) => {
      const likes = Array.isArray(p.likes) ? p.likes.map((id: any) => String(id)) : [];
      return {
        ...p.toObject(),
        likeCount: likes.length,
        likedByMe: likes.includes(String(user._id)),
      };
    });

    res.status(200).json({
      success: true,
      page,
      limit,
      total,
      posts: mappedPosts,
    });
  } catch (error) {
    logger.error('Get feed error', { message: (error as any)?.message || String(error) });
    res.status(500).json({ success: false, error: 'Failed to load feed' });
  }
});

/**
 * POST /api/posts/:postId/like
 * Toggle like on a post
 */
router.post('/:postId/like', verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const firebaseUser = (res.locals as any).firebaseUser as { uid: string };
    const user = await User.findOne({ firebaseUid: firebaseUser.uid });
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const postId = req.params.postId;
    const post = await Post.findById(postId);
    if (!post) {
      res.status(404).json({ success: false, error: 'Post not found' });
      return;
    }

    const userIdStr = String(user._id);
    const likes = (post as any).likes as any[] | undefined;
    const alreadyLiked = Array.isArray(likes) && likes.map((id) => String(id)).includes(userIdStr);

    if (alreadyLiked) {
      await Post.updateOne({ _id: post._id }, { $pull: { likes: user._id } });
    } else {
      await Post.updateOne({ _id: post._id }, { $addToSet: { likes: user._id } });
    }

    const updated = await Post.findById(post._id).populate('author', 'displayName photoURL');
    const updatedLikes = Array.isArray((updated as any)?.likes) ? (updated as any).likes.map((id: any) => String(id)) : [];

    res.status(200).json({
      success: true,
      post: {
        ...(updated as any).toObject(),
        likeCount: updatedLikes.length,
        likedByMe: updatedLikes.includes(userIdStr),
      },
    });
  } catch (error) {
    logger.error('Toggle like error', { message: (error as any)?.message || String(error) });
    res.status(500).json({ success: false, error: 'Failed to toggle like' });
  }
});

/**
 * GET /api/posts/:postId/comments
 * Get comments for a post
 */
router.get('/:postId/comments', verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const comments = await Comment.find({ postId })
      .sort({ createdAt: 1 })
      .populate('author', 'displayName photoURL');

    res.status(200).json({ success: true, comments });
  } catch (error) {
    logger.error('Get comments error', { message: (error as any)?.message || String(error) });
    res.status(500).json({ success: false, error: 'Failed to load comments' });
  }
});

/**
 * POST /api/posts/:postId/comments
 * Add a comment to a post
 */
router.post(
  '/:postId/comments',
  verifyFirebaseToken,
  [
    body('content').isString().trim().isLength({ min: 1, max: 500 }).withMessage('Comment must be 1-500 characters'),
  ],
  validate,
  async (req: Request, res: Response) => {
    try {
      const firebaseUser = (res.locals as any).firebaseUser as { uid: string };
      const { postId } = req.params;
      const { content } = req.body;

      const user = await User.findOne({ firebaseUid: firebaseUser.uid });
      if (!user) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }

      const post = await Post.findById(postId);
      if (!post) {
        res.status(404).json({ success: false, error: 'Post not found' });
        return;
      }

      const comment = await Comment.create({
        postId,
        author: user._id,
        content,
      });

      await comment.populate('author', 'displayName photoURL');

      res.status(201).json({ success: true, comment });
    } catch (error) {
      logger.error('Add comment error', { message: (error as any)?.message || String(error) });
      res.status(500).json({ success: false, error: 'Failed to add comment' });
    }
  }
);

/**
 * POST /api/posts/:postId/save
 * Toggle save post
 */
router.post('/:postId/save', verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const firebaseUser = (res.locals as any).firebaseUser as { uid: string };
    const user = await User.findOne({ firebaseUid: firebaseUser.uid });
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const { postId } = req.params;
    const post = await Post.findById(postId);
    if (!post) {
      res.status(404).json({ success: false, error: 'Post not found' });
      return;
    }

    // Initialize savedPosts if undefined
    if (!user.savedPosts) {
      user.savedPosts = [];
    }

    const postIdObj = post._id as any; // Cast to avoid TS issues if needed
    const savedIndex = user.savedPosts.findIndex((id) => String(id) === String(postIdObj));

    let isSaved = false;
    if (savedIndex > -1) {
      // Unsave
      user.savedPosts.splice(savedIndex, 1);
      isSaved = false;
    } else {
      // Save
      user.savedPosts.push(postIdObj);
      isSaved = true;
    }

    await user.save();

    res.status(200).json({ success: true, isSaved });
  } catch (error) {
    logger.error('Toggle save post error', { message: (error as any)?.message || String(error) });
    res.status(500).json({ success: false, error: 'Failed to save post' });
  }
});

export default router;
