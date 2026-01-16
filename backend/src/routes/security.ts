import { Router, Request, Response } from 'express';
import { handleScreenshotDetection, reportContent } from '../controllers/securityController';
import { verifyFirebaseToken } from '../middleware/auth';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting for reports
const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each IP to 5 reports per hour
  message: 'Too many reports submitted, please try again later',
});

/**
 * POST /api/security/report
 * Endpoint to report content or sessions
 * Body: { sessionId, messageId, reason, category }
 */
router.post('/report', verifyFirebaseToken, reportLimiter, reportContent);

/**
 * POST /api/security/screenshot-detected
 * Endpoint to log when a screenshot is detected on the client
 * Body: { userId, timestamp, location }
 */
router.post('/screenshot-detected', handleScreenshotDetection);

/**
 * GET /api/security/status
 * Health check for security features
 */
router.get('/status', (req: Request, res: Response) => {
  res.status(200).json({
    enabled: true,
    features: ['screenshot_detection_logging'],
    message: 'Security monitoring is active'
  });
});

export default router;
