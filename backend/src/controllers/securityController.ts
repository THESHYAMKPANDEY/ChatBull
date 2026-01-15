import { Request, Response } from 'express';

// Create a controller to handle screenshot detection events
export const handleScreenshotDetection = async (req: Request, res: Response) => {
  try {
    const { userId, timestamp, location } = req.body;

    // Log the screenshot event for security monitoring
    console.log(`🚨 SECURITY ALERT: Screenshot detected for user ${userId} at ${timestamp} in ${location || 'unknown location'}`);

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
    console.error('Screenshot detection error:', error);
    res.status(500).json({ error: 'Failed to process screenshot detection' });
  }
};
