import { Router, Request, Response } from 'express';
import { verifyFirebaseToken } from '../middleware/auth';
import User from '../models/User';
import KeyBundle from '../models/KeyBundle';
import GroupKey from '../models/GroupKey';
import Group from '../models/Group';
import { logger } from '../utils/logger';

const router = Router();

const asTrimmed = (value: unknown, maxLen: number): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > maxLen ? trimmed.slice(0, maxLen) : trimmed;
};

// Upload or rotate identity key
router.post('/upload', verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const firebaseUser = (res.locals as any).firebaseUser as { uid: string };
    const identityKey = asTrimmed(req.body?.identityKey, 4096);
    const deviceId = asTrimmed(req.body?.deviceId, 128) || '';

    if (!identityKey) {
      res.status(400).json({ error: 'identityKey is required' });
      return;
    }

    const user = await User.findOne({ firebaseUid: firebaseUser.uid });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const record = await KeyBundle.findOneAndUpdate(
      { userId: user._id },
      { identityKey, deviceId },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({
      success: true,
      userId: user._id,
      identityKey: record.identityKey,
      updatedAt: record.updatedAt,
    });
  } catch (error: any) {
    logger.error('Key upload error', { message: error?.message || String(error) });
    res.status(500).json({ error: 'Failed to upload key' });
  }
});

// Get a single user's public key
router.get('/:userId', verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const record = await KeyBundle.findOne({ userId });
    if (!record) {
      res.status(404).json({ error: 'Key not found' });
      return;
    }
    res.status(200).json({
      success: true,
      userId: record.userId,
      identityKey: record.identityKey,
      updatedAt: record.updatedAt,
    });
  } catch (error: any) {
    logger.error('Get key error', { message: error?.message || String(error) });
    res.status(500).json({ error: 'Failed to fetch key' });
  }
});

// Fetch multiple keys (batch)
router.post('/batch', verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const userIds = Array.isArray(req.body?.userIds) ? req.body.userIds : [];
    const safeIds = userIds.filter((id: any) => typeof id === 'string').slice(0, 200);

    const records = await KeyBundle.find({ userId: { $in: safeIds } }).select('userId identityKey updatedAt');
    res.status(200).json({
      success: true,
      keys: records.map((r) => ({
        userId: r.userId,
        identityKey: r.identityKey,
        updatedAt: r.updatedAt,
      })),
    });
  } catch (error: any) {
    logger.error('Batch keys error', { message: error?.message || String(error) });
    res.status(500).json({ error: 'Failed to fetch keys' });
  }
});

// Store group keys for members (encrypted per user)
router.post('/group/:groupId', verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const firebaseUser = (res.locals as any).firebaseUser as { uid: string };
    const { groupId } = req.params;
    const keys = Array.isArray(req.body?.keys) ? req.body.keys : [];
    const version = typeof req.body?.version === 'number' ? req.body.version : 1;

    if (!groupId) {
      res.status(400).json({ error: 'groupId is required' });
      return;
    }

    const user = await User.findOne({ firebaseUid: firebaseUser.uid });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const group = await Group.findById(groupId);
    if (!group) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }

    const isMember = group.members.some((id: any) => String(id) === String(user._id));
    if (!isMember) {
      res.status(403).json({ error: 'Not a group member' });
      return;
    }

    const ops = keys
      .filter((k: any) => typeof k?.userId === 'string' && typeof k?.encryptedKey === 'string' && typeof k?.nonce === 'string')
      .slice(0, 500)
      .map((k: any) => ({
        updateOne: {
          filter: { groupId, userId: k.userId },
          update: {
            groupId,
            userId: k.userId,
            encryptedKey: k.encryptedKey,
            nonce: k.nonce,
            senderId: user._id,
            version,
          },
          upsert: true,
        },
      }));

    if (ops.length === 0) {
      res.status(400).json({ error: 'No valid keys provided' });
      return;
    }

    await GroupKey.bulkWrite(ops);

    res.status(200).json({ success: true, count: ops.length });
  } catch (error: any) {
    logger.error('Group key upload error', { message: error?.message || String(error) });
    res.status(500).json({ error: 'Failed to save group keys' });
  }
});

// Get current user's group key
router.get('/group/:groupId', verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const firebaseUser = (res.locals as any).firebaseUser as { uid: string };
    const { groupId } = req.params;

    const user = await User.findOne({ firebaseUid: firebaseUser.uid });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const record = await GroupKey.findOne({ groupId, userId: user._id });
    if (!record) {
      res.status(404).json({ error: 'Group key not found' });
      return;
    }

    res.status(200).json({
      success: true,
      groupId: record.groupId,
      userId: record.userId,
      encryptedKey: record.encryptedKey,
      nonce: record.nonce,
      senderId: record.senderId,
      version: record.version,
      updatedAt: record.updatedAt,
    });
  } catch (error: any) {
    logger.error('Group key fetch error', { message: error?.message || String(error) });
    res.status(500).json({ error: 'Failed to fetch group key' });
  }
});

export default router;
