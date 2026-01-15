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
    console.log('=== AUTH MIDDLEWARE START ===');
    console.log('Request URL:', req.url);
    console.log('Authorization Header:', req.headers.authorization);
    console.log('Request Body:', req.body);
    
    const authHeader = req.headers.authorization || '';

    if (!authHeader.startsWith('Bearer ')) {
      console.error('❌ Invalid authorization header format');
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    if (!isFirebaseAdminReady()) {
      console.error('❌ Firebase Admin not ready');
      return res
        .status(500)
        .json({ error: 'Authentication service not configured on server' });
    }

    const idToken = authHeader.replace('Bearer ', '').trim();

    if (!idToken) {
      console.error('❌ Empty ID token');
      return res.status(401).json({ error: 'Missing ID token' });
    }

    console.log('🔍 Verifying Firebase token...');
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    console.log('✅ Token verified successfully');
    console.log('Decoded Token UID:', decodedToken.uid);
    console.log('Decoded Token Email:', decodedToken.email);

    (res.locals as any).firebaseUser = decodedToken;
    
    console.log('=== AUTH MIDDLEWARE END ===');
    return next();
  } catch (error) {
    console.error('Firebase token verification failed:', error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

