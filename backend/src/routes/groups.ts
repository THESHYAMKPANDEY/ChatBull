import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import Group from '../models/Group';
import { verifyFirebaseToken } from '../middleware/auth';
import { validate } from '../middleware/validation';
import User from '../models/User';

const router = Router();

// Create a new group
router.post(
  '/',
  verifyFirebaseToken,
  [
    body('name').trim().notEmpty().withMessage('Group name is required'),
    body('members').isArray().withMessage('Members must be an array of user IDs'),
  ],
  validate,
  async (req: Request, res: Response) => {
    try {
      const { name, description, members } = req.body;
      
      // Ensure current user is admin and part of members
      const adminId = (req as any).user.id;
      const uniqueMembers = Array.from(new Set([...members, adminId]));

      const group = new Group({
        name,
        description,
        admin: adminId,
        members: uniqueMembers,
      });

      await group.save();
      
      const populatedGroup = await Group.findById(group._id)
        .populate('members', 'displayName photoURL isOnline')
        .populate('admin', 'displayName photoURL');

      res.status(201).json({ success: true, group: populatedGroup });
    } catch (error) {
      console.error('Create group error:', error);
      res.status(500).json({ success: false, error: 'Failed to create group' });
    }
  }
);

// Get user's groups
router.get('/', verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const groups = await Group.find({ members: userId })
      .populate('members', 'displayName photoURL isOnline')
      .populate('admin', 'displayName photoURL')
      .sort({ updatedAt: -1 });

    res.status(200).json({ success: true, groups });
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch groups' });
  }
});

// Add member to group
router.post(
  '/:groupId/members',
  verifyFirebaseToken,
  [body('userId').notEmpty().withMessage('User ID is required')],
  validate,
  async (req: Request, res: Response) => {
    try {
      const { groupId } = req.params;
      const { userId } = req.body;
      const currentUserId = (req as any).user.id;

      const group = await Group.findById(groupId);
      if (!group) {
        res.status(404).json({ success: false, error: 'Group not found' });
        return;
      }

      // Only admin can add members (for now)
      if (group.admin.toString() !== currentUserId) {
        res.status(403).json({ success: false, error: 'Only admin can add members' });
        return;
      }

      if (group.members.includes(userId)) {
        res.status(400).json({ success: false, error: 'User already in group' });
        return;
      }

      group.members.push(userId);
      await group.save();

      res.status(200).json({ success: true, group });
    } catch (error) {
      console.error('Add member error:', error);
      res.status(500).json({ success: false, error: 'Failed to add member' });
    }
  }
);

export default router;
