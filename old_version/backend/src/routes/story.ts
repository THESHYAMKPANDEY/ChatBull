import { Router, Request, Response } from 'express';
import Story from '../models/Story';
import User from '../models/User';
import { verifyFirebaseToken } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// Get stories feed (friends' stories + own stories)
router.get('/feed', verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const firebaseUser = (res.locals as any).firebaseUser as { uid: string };
    const user = await User.findOne({ firebaseUid: firebaseUser.uid });

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    // For now, return all active stories (global feed style) or just own
    // In a real app, you'd filter by following list
    const stories = await Story.find({
      expiresAt: { $gt: new Date() }
    })
    .sort({ createdAt: -1 })
    .populate('author', 'displayName photoURL');

    // Group stories by user
    const storiesByUser: Record<string, any> = {};
    
    stories.forEach((story: any) => {
      const authorId = story.author._id.toString();
      if (!storiesByUser[authorId]) {
        storiesByUser[authorId] = {
          userId: authorId,
          username: story.author.displayName,
          avatar: story.author.photoURL,
          stories: []
        };
      }
      storiesByUser[authorId].stories.push({
        id: story._id,
        mediaUrl: story.mediaUrl,
        mediaType: story.mediaType,
        createdAt: story.createdAt,
        viewed: story.viewers.includes(user._id)
      });
    });

    res.status(200).json({ 
      success: true, 
      stories: Object.values(storiesByUser) 
    });
  } catch (error) {
    logger.error('Get stories error', { message: (error as any)?.message || String(error) });
    res.status(500).json({ success: false, error: 'Failed to load stories' });
  }
});

// Create a new story
router.post('/', verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const firebaseUser = (res.locals as any).firebaseUser as { uid: string };
    const { mediaUrl, type } = req.body;

    if (!mediaUrl || !type) {
      res.status(400).json({ success: false, error: 'Media URL and type are required' });
      return;
    }

    const user = await User.findOne({ firebaseUid: firebaseUser.uid });
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const story = await Story.create({
      author: user._id,
      mediaUrl,
      mediaType: type,
      viewers: []
    });

    await story.populate('author', 'displayName photoURL');

    res.status(201).json({ success: true, story });
  } catch (error) {
    logger.error('Create story error', { message: (error as any)?.message || String(error) });
    res.status(500).json({ success: false, error: 'Failed to create story' });
  }
});

// Mark story as viewed
router.post('/:storyId/view', verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const firebaseUser = (res.locals as any).firebaseUser as { uid: string };
    const { storyId } = req.params;

    const user = await User.findOne({ firebaseUid: firebaseUser.uid });
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const story = await Story.findById(storyId);
    if (!story) {
      res.status(404).json({ success: false, error: 'Story not found' });
      return;
    }

    if (!story.viewers.some((id: any) => String(id) === String(user._id))) {
      story.viewers.push(user._id);
      await story.save();
    }

    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('View story error', { message: (error as any)?.message || String(error) });
    res.status(500).json({ success: false, error: 'Failed to mark view' });
  }
});

export default router;
