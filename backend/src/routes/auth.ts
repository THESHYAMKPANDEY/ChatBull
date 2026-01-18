import { Router, Request, Response } from 'express';
import User from '../models/User';
import { validate } from '../middleware/validation';
import { verifyFirebaseToken } from '../middleware/auth';

const router = Router();

// Register/Login user (creates user if not exists)
router.post('/sync', verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const firebaseUser = (res.locals as any).firebaseUser as {
      uid: string;
      email?: string;
      name?: string;
      picture?: string;
    };

    // Safely extract body parameters
    const body = req.body || {};
    const displayNameFromBody = body.displayName;
    const photoURLFromBody = body.photoURL;
    const phoneNumber = body.phoneNumber;

    const firebaseUid = firebaseUser.uid;
    const email = firebaseUser.email || req.body.email;

    if (!firebaseUid || !email) {
      res.status(400).json({ error: 'Authenticated Firebase user must include an email' });
      return;
    }

    const resolvedDisplayName =
      displayNameFromBody ||
      firebaseUser.name ||
      email.split('@')[0];

    const resolvedPhotoURL =
      photoURLFromBody ||
      firebaseUser.picture ||
      '';

    let user = null;
    let attempt = 1;
    const maxAttempts = 3;
    
    while (attempt <= maxAttempts && !user) {
      try {
        // First: Try to find existing user
        user = await User.findOne({ firebaseUid });
        
        if (user) {
          // Update existing user
          user.email = email;
          user.displayName = resolvedDisplayName || user.displayName;
          user.photoURL = resolvedPhotoURL || user.photoURL;
          user.phoneNumber = phoneNumber || user.phoneNumber;
          user.isOnline = true;
          user.lastSeen = new Date();
          await user.save();
        } else {
          // Try to create new user with explicit handling of potential username field
          const userData: any = {
            firebaseUid,
            email,
            displayName: resolvedDisplayName,
            photoURL: resolvedPhotoURL,
            phoneNumber: phoneNumber || '',
            isOnline: true,
            lastSeen: new Date(),
          };
          
          // Only add username if it's not null/undefined to avoid unique constraint
          if (resolvedDisplayName && resolvedDisplayName.trim() !== '') {
            userData.username = resolvedDisplayName.toLowerCase().replace(/[^a-zA-Z0-9_]/g, '_');
          }
          
          user = await User.create(userData);
        }
      } catch (createError: any) {
        if (createError.code === 11000) {
          // Handle duplicate key error with multiple fallback strategies
          
          // Check if error is related to username field specifically
          if (createError.message.includes('username')) {
            // Find by email or firebaseUid instead
            user = await User.findOne({ email }) || await User.findOne({ firebaseUid });
            if (user) {
              user.email = email;
              user.displayName = resolvedDisplayName || user.displayName;
              user.photoURL = resolvedPhotoURL || user.photoURL;
              user.phoneNumber = phoneNumber || user.phoneNumber;
              user.isOnline = true;
              user.lastSeen = new Date();
              await user.save();
            }
          } else {
            // Other duplicate key errors (email or firebaseUid)
            // Strategy 1: Find by email
            user = await User.findOne({ email });
            if (user) {
              console.log('✅ Found user by email, updating...');
              user.firebaseUid = firebaseUid;
              user.displayName = resolvedDisplayName || user.displayName;
              user.photoURL = resolvedPhotoURL || user.photoURL;
              user.phoneNumber = phoneNumber || user.phoneNumber;
              user.isOnline = true;
              user.lastSeen = new Date();
              await user.save();
              console.log('✅ User updated by email strategy');
            } else {
              // Strategy 2: Find by firebaseUid again (race condition)
              user = await User.findOne({ firebaseUid });
              if (user) {
                console.log('✅ Found user by firebaseUid (race condition), updating...');
                user.email = email;
                user.displayName = resolvedDisplayName || user.displayName;
                user.photoURL = resolvedPhotoURL || user.photoURL;
                user.phoneNumber = phoneNumber || user.phoneNumber;
                user.isOnline = true;
                user.lastSeen = new Date();
                await user.save();
                console.log('✅ User updated by firebaseUid strategy');
              } else {
                // Strategy 3: Wait and retry (handle temporary issues)
                if (attempt < maxAttempts) {
                  console.log(`⏳ Waiting 100ms before retry ${attempt + 1}...`);
                  await new Promise(resolve => setTimeout(resolve, 100));
                }
              }
            }
          }
        } else {
          // For other errors, log and re-throw
          console.error('💥 Non-duplicate error occurred:', createError);
          throw createError;
        }
      }
      
      attempt++;
    }
    
    // Final verification
    if (!user) {
      console.error('💥 Failed to sync user after all attempts');
      throw new Error('Could not create or find user after multiple attempts');
    }

    // Verify user exists before sending response
    if (!user) {
      throw new Error('Could not create or find user');
    }

    res.status(200).json({
      message: 'User synced successfully',
      user: {
        id: user._id,
        firebaseUid: user.firebaseUid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        isOnline: user.isOnline,
      },
    });
  } catch (error: any) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('AUTH SYNC ERROR:', {
        type: error?.constructor?.name,
        message: error?.message,
        code: error?.code,
        stack: error?.stack,
      });
    } else {
      console.error('AUTH SYNC ERROR:', error?.message || 'unknown');
    }
    
    // More detailed error response
    res.status(500).json({ 
      error: 'Failed to sync user with server', 
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      code: process.env.NODE_ENV === 'development' ? error.code : undefined,
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] || 'unknown'
    });
  }
});

// Get user profile - only allow access to own profile
router.get('/profile/:firebaseUid', verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const firebaseUser = (res.locals as any).firebaseUser as { uid: string };
    const { firebaseUid } = req.params;

    if (firebaseUid !== firebaseUser.uid) {
      res.status(403).json({ error: 'Forbidden: cannot access other user profiles' });
      return;
    }

    const user = await User.findOne({ firebaseUid });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all users (for chat list) - must be authenticated
router.get('/users', verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const users = await User.find({}, 'displayName email photoURL isOnline lastSeen');
    res.status(200).json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout - set user offline
router.post('/logout', verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const firebaseUser = (res.locals as any).firebaseUser as { uid: string };

    await User.findOneAndUpdate(
      { firebaseUid: firebaseUser.uid },
      { isOnline: false, lastSeen: new Date() }
    );

    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
