import { Router, Request, Response } from 'express';
import { handleScreenshotDetection } from '../controllers/securityController';
import rateLimit from 'express-rate-limit';
import { verifyFirebaseToken } from '../middleware/auth';

const router = Router();

const screenshotLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  message: 'Too many security events, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * POST /api/security/screenshot-detected
 * Endpoint to log when a screenshot is detected on the client
 * Body: { userId, timestamp, location }
 */
router.post('/screenshot-detected', verifyFirebaseToken, screenshotLimiter, handleScreenshotDetection);

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
