import express from 'express';
import User from '../models/User';
import { verifyFirebaseToken } from '../middleware/auth';

const router = express.Router();

// Sync contacts - send phone numbers, get back registered users
router.post('/sync', verifyFirebaseToken, async (req, res) => {
  try {
    const { phoneNumbers } = req.body; // Array of strings

    if (!Array.isArray(phoneNumbers)) {
      return res.status(400).json({ error: 'phoneNumbers must be an array' });
    }

    // Normalize phone numbers (strip spaces, dashes, etc.) - simplified for now
    // In production, use libphonenumber-js
    const users = await User.find({
      phoneNumber: { $in: phoneNumbers }
    }).select('_id displayName email photoURL phoneNumber isOnline lastSeen');

    res.json({ users });
  } catch (error) {
    console.error('Sync contacts error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
