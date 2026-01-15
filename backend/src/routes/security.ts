import { Router, Request, Response } from 'express';
import { handleScreenshotDetection } from '../controllers/securityController';

const router = Router();

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
