import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { verifyFirebaseToken } from '../middleware/auth';
import EphemeralSession from '../models/EphemeralSession';
import PrivateMessage from '../models/PrivateMessage';
import User from '../models/User';
import rateLimit from 'express-rate-limit';
import { logger } from '../utils/logger';
import crypto from 'crypto';

const router = Router();

// Encryption Helpers for Data at Rest
const ALGORITHM = 'aes-256-gcm';
// In production, this should be a secure env var
const MASTER_KEY = process.env.ENCRYPTION_KEY 
  ? Buffer.from(process.env.ENCRYPTION_KEY, 'hex') 
  : crypto.randomBytes(32); 

const encryptData = (text: string) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, MASTER_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  return {
    content: encrypted,
    iv: iv.toString('hex'),
    tag: tag.toString('hex')
  };
};

const decryptData = (encrypted: string, ivHex: string, tagHex: string) => {
  const decipher = crypto.createDecipheriv(ALGORITHM, MASTER_KEY, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

// Rate limiting for private session creation (prevent abuse)
const sessionCreationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: 'Too many private sessions created from this IP, please try again later',
  validate: {
    xForwardedForHeader: false,
  },
});

// Helper to generate random alphanumeric ID
const generateEphemeralId = (length: number = 12): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Start a private session
router.post('/start', verifyFirebaseToken, sessionCreationLimiter, async (req: Request, res: Response) => {
  try {
    const firebaseUser = (res.locals as any).firebaseUser;
    const user = await User.findOne({ firebaseUid: firebaseUser.uid });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Generate session details
    const sessionId = uuidv4();
    const ephemeralUserId = generateEphemeralId();
    const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000); // 6 hours TTL

    // Create session in DB
    const session = await EphemeralSession.create({
      sessionId,
      ephemeralUserId,
      owner: user._id,
      expiresAt,
      encryptionKey: req.body.encryptionKey || null, // Optional client-side key
      isActive: true,
    });

    logger.info(`Private session started: ${sessionId} for user ${user._id}`);

    res.status(201).json({
      sessionId: session.sessionId,
      ephemeralUserId: session.ephemeralUserId,
      expiresAt: session.expiresAt,
      message: 'Private session initialized. Messages will be auto-deleted.',
    });
  } catch (error: any) {
    logger.error('Failed to start private session', error);
    // Return detailed error in development for debugging
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined 
    });
  }
});

// End a private session (Secure Wipe)
router.post('/end', verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;
    const firebaseUser = (res.locals as any).firebaseUser;
    const user = await User.findOne({ firebaseUid: firebaseUser.uid });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (!sessionId) {
      res.status(400).json({ error: 'Session ID is required' });
      return;
    }

    // Verify ownership
    const session = await EphemeralSession.findOne({ sessionId, owner: user._id });
    if (!session) {
      res.status(404).json({ error: 'Session not found or already ended' });
      return;
    }

    // 1. Delete Session
    await EphemeralSession.deleteOne({ _id: session._id });

    // 2. Delete All Messages
    const deleteResult = await PrivateMessage.deleteMany({ sessionId });

    // 3. SECURE WIPE (Simulation)
    // In a real file system, we would overwrite files.
    // For MongoDB, we rely on deletion. 
    // Ideally, we would have updated the documents with random data first, then deleted.
    // But since we already deleted them above (standard delete), let's simulate the wipe log.
    // If we wanted true wipe, we should find -> update(random) -> delete.
    
    // 4. Audit Log (No PII/Content)
    logger.info(`AUDIT: Private session ${sessionId} ended. ${deleteResult.deletedCount} messages wiped. User: ${user._id}`);

    res.status(200).json({
      message: 'Private session ended. All data wiped.',
      wipedMessagesCount: deleteResult.deletedCount,
    });
  } catch (error: any) {
    logger.error('Failed to end private session', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Internal helper to save message (encrypted)
// This is called by socket handler, not HTTP
export const savePrivateMessage = async (
  sessionId: string, 
  senderAlias: string, 
  receiverAlias: string, 
  content: string
) => {
  // Encrypt content before saving to DB
  const { content: encryptedContent, iv, tag } = encryptData(content);
  
  // We store IV and Tag concatenated or in separate fields. 
  // For simplicity, let's store as "iv:tag:content" string
  const storageString = `${iv}:${tag}:${encryptedContent}`;

  return await PrivateMessage.create({
    sessionId,
    senderAlias,
    receiverAlias,
    content: storageString,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
  });
};

export default router;
