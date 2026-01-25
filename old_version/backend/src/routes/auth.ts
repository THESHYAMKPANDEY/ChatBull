import { Router, Request, Response } from 'express';
import User from '../models/User';
import EmailOtp from '../models/EmailOtp';
import { validate } from '../middleware/validation';
import { verifyFirebaseToken } from '../middleware/auth';
import { logger } from '../utils/logger';
import nodemailer from 'nodemailer';
import { getAuth } from 'firebase-admin/auth';

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
          // if (resolvedDisplayName && resolvedDisplayName.trim() !== '') {
          //   userData.username = resolvedDisplayName.toLowerCase().replace(/[^a-zA-Z0-9_]/g, '_');
          // }
          
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
              user.firebaseUid = firebaseUid;
              user.displayName = resolvedDisplayName || user.displayName;
              user.photoURL = resolvedPhotoURL || user.photoURL;
              user.phoneNumber = phoneNumber || user.phoneNumber;
              user.isOnline = true;
              user.lastSeen = new Date();
              await user.save();
            } else {
              // Strategy 2: Find by firebaseUid again (race condition)
              user = await User.findOne({ firebaseUid });
              if (user) {
                user.email = email;
                user.displayName = resolvedDisplayName || user.displayName;
                user.photoURL = resolvedPhotoURL || user.photoURL;
                user.phoneNumber = phoneNumber || user.phoneNumber;
                user.isOnline = true;
                user.lastSeen = new Date();
                await user.save();
              } else {
                // Strategy 3: Wait and retry (handle temporary issues)
                if (attempt < maxAttempts) {
                  await new Promise(resolve => setTimeout(resolve, 100));
                }
              }
            }
          }
        } else {
          // For other errors, log and re-throw
          logger.error('Auth sync non-duplicate error', { message: createError?.message || String(createError) });
          throw createError;
        }
      }
      
      attempt++;
    }
    
    // Final verification
    if (!user) {
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
    logger.error('Auth sync error', { message: error?.message || 'unknown' });
    
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
    logger.error('Get profile error', { message: (error as any)?.message || String(error) });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all users (for chat list) - must be authenticated
router.get('/users', verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const users = await User.find({}, 'displayName email photoURL isOnline lastSeen');
    res.status(200).json({ users });
  } catch (error) {
    logger.error('Get users error', { message: (error as any)?.message || String(error) });
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
    logger.error('Logout error', { message: (error as any)?.message || String(error) });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Email OTP - Send
router.post('/email-otp/send', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save to DB
    await EmailOtp.create({
      email,
      otp,
    });

    // Send Email
    // Note: In production, configure these env vars
    // Force GoDaddy Workspace for debugging - V3 NUCLEAR
        const transporter = nodemailer.createTransport({
            host: 'smtpout.secureserver.net',
            port: 465,
            secure: true,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        console.log("!!! NUCLEAR FIX V3 APPLIED - USING GODADDY !!!");
        logger.info(`Attempting to send email via smtpout.secureserver.net for user ${process.env.SMTP_USER}`);

    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || `"ChatBull" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Your Login Code',
        text: `Your verification code is: ${otp}`,
        html: `<b>Your verification code is: ${otp}</b>`,
      });
      logger.info(`OTP sent to ${email}`);
    } else {
      logger.warn(`SMTP not configured. OTP for ${email} is ${otp}`);
    }

    res.status(200).json({ message: 'OTP sent' });
  } catch (error) {
    logger.error('Send OTP error', { message: (error as any)?.message || String(error) });
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// Email OTP - Verify
router.get('/debug-version', async (req: Request, res: Response) => {
    res.json({ 
        version: "NUCLEAR V3 - GODADDY HARDCODED",
        host: 'smtpout.secureserver.net',
        port: 465,
        user: process.env.SMTP_USER ? 'CONFIGURED' : 'MISSING',
        pass: process.env.SMTP_PASS ? 'CONFIGURED' : 'MISSING'
    });
});

router.post('/email-otp/verify', async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      res.status(400).json({ error: 'Email and OTP are required' });
      return;
    }

    const record = await EmailOtp.findOne({ email, otp }).sort({ createdAt: -1 });
    
    if (!record) {
      res.status(400).json({ error: 'Invalid OTP' });
      return;
    }

    if (record.expiresAt < new Date()) {
      res.status(400).json({ error: 'OTP expired' });
      return;
    }

    // OTP is valid. Generate Firebase Custom Token
    let firebaseUid = '';
    
    try {
        const userRecord = await getAuth().getUserByEmail(email);
        firebaseUid = userRecord.uid;
    } catch (e) {
        // User doesn't exist in Firebase, create them
        const userRecord = await getAuth().createUser({
            email,
            emailVerified: true,
        });
        firebaseUid = userRecord.uid;
    }

    const customToken = await getAuth().createCustomToken(firebaseUid);

    // Clean up used OTP
    await EmailOtp.deleteOne({ _id: record._id });

    res.status(200).json({ 
        message: 'OTP verified',
        customToken
    });

  } catch (error) {
    logger.error('Verify OTP error', { message: (error as any)?.message || String(error) });
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

export default router;
