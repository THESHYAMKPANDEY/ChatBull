import { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';
import { isFirebaseAdminReady } from '../services/notifications';

/**
 * Verifies Firebase ID token from Authorization header and attaches
 * the decoded token to res.locals.firebaseUser.
 *
 * Expected header: Authorization: Bearer <idToken>
 */
export const verifyFirebaseToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization || '';

    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    if (!isFirebaseAdminReady()) {
      return res
        .status(500)
        .json({ error: 'Authentication service not configured on server' });
    }

    const idToken = authHeader.replace('Bearer ', '').trim();

    if (!idToken) {
      return res.status(401).json({ error: 'Missing ID token' });
    }

    const decodedToken = await admin.auth().verifyIdToken(idToken);

    (res.locals as any).firebaseUser = decodedToken;
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

