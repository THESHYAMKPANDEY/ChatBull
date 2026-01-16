import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import User from '../models/User';

// Create a controller to handle screenshot detection events
export const handleScreenshotDetection = async (req: Request, res: Response) => {
  try {
    const { userId, timestamp, location } = req.body;

    // Log the screenshot event for security monitoring
    logger.warn(`🚨 SECURITY ALERT: Screenshot detected for user ${userId} at ${timestamp} in ${location || 'unknown location'}`);

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
    logger.error('Screenshot detection error:', error);
    res.status(500).json({ error: 'Failed to process screenshot detection' });
  }
};

// Handle content reporting
export const reportContent = async (req: Request, res: Response) => {
  try {
    const firebaseUser = (res.locals as any).firebaseUser;
    const { sessionId, messageId, reason, category } = req.body;
    
    // Validate report
    if (!reason || !category) {
      res.status(400).json({ error: 'Reason and category are required' });
      return;
    }

    const reporter = await User.findOne({ firebaseUid: firebaseUser.uid });
    
    // Log the report securely
    // In a real system, we might store this in a "Reports" collection.
    // Since this is a privacy-focused app, we log the METADATA only, not content if possible.
    // If the session is ephemeral, the content might already be gone or encrypted.
    
    logger.info(`REPORT FILED: User ${reporter?._id} reported session ${sessionId} / message ${messageId}. Reason: ${reason} [${category}]`);

    // In a production system, this would trigger an Admin Alert or create a ticket.
    
    res.status(200).json({ 
      message: 'Report received. We will review this session metadata for compliance.',
      ticketId: `TICKET-${Date.now()}`
    });
  } catch (error) {
    logger.error('Report submission error:', error);
    res.status(500).json({ error: 'Failed to submit report' });
  }
};
