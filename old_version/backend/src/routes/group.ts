import express from 'express';
import Group from '../models/Group';
import User from '../models/User';
import { verifyFirebaseToken } from '../middleware/auth';

const router = express.Router();

// Create a new group
router.post('/', verifyFirebaseToken, async (req, res) => {
  try {
    const firebaseUser = (res.locals as any).firebaseUser;
    const currentUser = await User.findOne({ firebaseUid: firebaseUser.uid });
    
    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const adminId = currentUser._id;
    const { name, members, avatar, description } = req.body;

    if (!name || !members || !Array.isArray(members)) {
      return res.status(400).json({ error: 'Name and members array are required' });
    }

    // Add creator to members if not present
    if (!members.includes(adminId)) {
      members.push(adminId);
    }

    // Verify members exist
    const validMembers = await User.find({ _id: { $in: members } }).distinct('_id');

    if (validMembers.length < 2) {
       return res.status(400).json({ error: 'Group must have at least 2 valid members' });
    }

    const group = new Group({
      name,
      description,
      avatar,
      members: validMembers,
      admins: [adminId]
    });

    await group.save();

    // Populate members for response
    await group.populate('members', 'displayName photoURL isOnline');
    
    res.status(201).json({ group });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get my groups
router.get('/', verifyFirebaseToken, async (req, res) => {
  try {
    const firebaseUser = (res.locals as any).firebaseUser;
    const currentUser = await User.findOne({ firebaseUid: firebaseUser.uid });
    
    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userId = currentUser._id;
    const groups = await Group.find({ members: userId })
      .populate('members', 'displayName photoURL isOnline')
      .populate('lastMessage')
      .sort({ updatedAt: -1 });
    
    res.json({ groups });
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
