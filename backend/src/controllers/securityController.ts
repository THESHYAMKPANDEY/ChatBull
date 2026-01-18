import { Request, Response } from 'express';
import User from '../models/User';
import SecurityEvent from '../models/SecurityEvent';

// Create a controller to handle screenshot detection events
export const handleScreenshotDetection = async (req: Request, res: Response) => {
  try {
    const firebaseUser = (res.locals as any).firebaseUser;
    const { timestamp, location } = req.body as { timestamp?: string; location?: string };

    if (!firebaseUser?.uid) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const clientTimestamp =
      typeof timestamp === 'string' && timestamp.trim().length > 0 ? new Date(timestamp) : undefined;
    const isClientTimestampValid = clientTimestamp instanceof Date && !Number.isNaN(clientTimestamp.getTime());

    const normalizedLocation =
      typeof location === 'string' && location.trim().length > 0 ? location.trim().slice(0, 200) : undefined;

    const user = await User.findOne({ firebaseUid: firebaseUser.uid }).select('_id');

    await SecurityEvent.create({
      type: 'screenshot_detected',
      firebaseUid: firebaseUser.uid,
      userId: user?._id,
      location: normalizedLocation,
      clientTimestamp: isClientTimestampValid ? clientTimestamp : undefined,
      ip: req.ip,
      userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'].slice(0, 512) : undefined,
    });

    // Here you could add additional security measures like:
    // - Incrementing a counter in the user's record
    // - Sending an alert to admins
    // - Temporarily locking the session
    // - Recording in audit logs

    // For now, just log and return success
    res.status(200).json({ 
      message: 'Screenshot detected and logged',
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process screenshot detection' });
  }
};
