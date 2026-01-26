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

    // Send Email Logic
    // Strategy: Try Resend API first (works on Render Free Tier), fallback to SMTP
    try {
        const resendApiKey = process.env.RESEND_API_KEY;
        
        if (resendApiKey) {
            console.log('🚀 Sending email via Resend API (Bypassing SMTP ports)...');
            const resendResponse = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${resendApiKey}`
                },
                body: JSON.stringify({
                    from: 'ChatBull <onboarding@resend.dev>', // Default free tier sender
                    to: email,
                    subject: 'Your ChatBull Login Code',
                    html: `
                      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                        <h2 style="color: #4A90E2;">ChatBull Verification</h2>
                        <p>Here is your one-time verification code:</p>
                        <h1 style="font-size: 32px; letter-spacing: 5px; background: #f4f4f4; padding: 10px; display: inline-block; border-radius: 5px;">${otp}</h1>
                        <p>This code will expire in 10 minutes.</p>
                      </div>
                    `
                })
            });

            if (!resendResponse.ok) {
                const errorText = await resendResponse.text();
                throw new Error(`Resend API Error: ${errorText}`);
            }
            logger.info(`OTP sent via Resend to ${email}`);
            
        } else {
            // SMTP Fallback (Likely to fail on Render Free Tier)
            console.log('⚠️ RESEND_API_KEY not found. Falling back to SMTP (May be blocked on Render Free Tier)...');
            
            const host = process.env.SMTP_HOST || 'smtpout.secureserver.net';
            const port = parseInt(process.env.SMTP_PORT || '465');
            const isSecure = process.env.SMTP_SECURE !== undefined 
                ? process.env.SMTP_SECURE === 'true' 
                : port === 465;
            
            const transporter = nodemailer.createTransport({
                host,
                port,
                secure: isSecure,
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
                tls: {
                    rejectUnauthorized: false,
                    ciphers: 'SSLv3'
                },
                // Increase timeout
                connectionTimeout: 10000
            });
    
            if (process.env.SMTP_USER && process.env.SMTP_PASS) {
                // FORCE FROM ADDRESS TO MATCH AUTH USER (Required for GoDaddy/Office365)
                const sender = process.env.SMTP_FROM || process.env.SMTP_USER;
                
                const info = await transporter.sendMail({
                    from: `"ChatBull Security" <${sender}>`,
                    to: email,
                    subject: '🔐 Your ChatBull Login Code',
                    text: `Your verification code is: ${otp}`,
                    html: `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>ChatBull Verification</title>
                    </head>
                    <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                        <table role="presentation" style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td align="center" style="padding: 40px 0;">
                                    <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.05);">
                                        <!-- Header -->
                                        <div style="background: linear-gradient(135deg, #128c7e 0%, #075e54 100%); padding: 32px 24px; text-align: center;">
                                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">ChatBull</h1>
                                            <p style="margin: 8px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">Secure Login Verification</p>
                                        </div>

                                        <!-- Content -->
                                        <div style="padding: 40px 32px; text-align: center;">
                                            <p style="margin: 0 0 24px; color: #475569; font-size: 16px; line-height: 1.5;">
                                                Someone (hopefully you) requested a verification code to log in to your ChatBull account.
                                            </p>
                                            
                                            <div style="background-color: #f1f5f9; border-radius: 12px; padding: 20px; margin: 0 0 24px; display: inline-block;">
                                                <span style="font-family: 'Courier New', monospace; font-size: 36px; font-weight: 700; color: #0f172a; letter-spacing: 6px;">${otp}</span>
                                            </div>

                                            <p style="margin: 0; color: #64748b; font-size: 14px;">
                                                This code will expire in 10 minutes. <br>
                                                If you didn't request this, please ignore this email.
                                            </p>
                                        </div>

                                        <!-- Footer -->
                                        <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
                                            <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                                                &copy; ${new Date().getFullYear()} ChatBull Inc. All rights reserved. <br>
                                                Military-grade secure communication.
                                            </p>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        </table>
                    </body>
                    </html>
                    `,
                });
                logger.info(`OTP sent via SMTP to ${email}`, { messageId: info.messageId, response: info.response });
            } else {
                logger.warn(`SMTP not configured. OTP for ${email} is ${otp}`);
            }
        }

        res.status(200).json({ message: 'OTP sent' });

    } catch (error: any) {
        logger.error('Send OTP error', { message: (error as any)?.message || String(error) });
        res.status(500).json({ 
            error: 'Failed to send OTP',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined 
        });
    }
  } catch (error) {
    logger.error('Email OTP send error', { message: (error as any)?.message || String(error) });
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// SMTP Diagnostic Endpoint
router.get('/smtp-test', async (req: Request, res: Response) => {
    try {
        const host = process.env.SMTP_HOST || 'smtpout.secureserver.net';
        const port = parseInt(process.env.SMTP_PORT || '465');
        const isSecure = process.env.SMTP_SECURE === 'true' || (process.env.SMTP_SECURE !== 'false' && port === 465);
        
        const config = {
            host,
            port,
            secure: isSecure,
            user: process.env.SMTP_USER ? '***CONFIGURED***' : 'MISSING',
            pass: process.env.SMTP_PASS ? '***CONFIGURED***' : 'MISSING',
        };
        
        const transporter = nodemailer.createTransport({
            host,
            port,
            secure: isSecure,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
            tls: { rejectUnauthorized: false }
        });

        await transporter.verify();
        
        res.json({
            status: 'success',
            message: 'SMTP Connection Verified Successfully',
            config
        });
    } catch (error: any) {
        res.status(500).json({
            status: 'error',
            message: error.message,
            stack: error.stack
        });
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
