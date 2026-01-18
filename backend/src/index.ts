import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
const mongoSanitize = require('express-mongo-sanitize');
import dotenv from 'dotenv';
import { requestLogger, errorHandler } from './utils/logger';
import { createServer } from 'http';
import { Server } from 'socket.io';
import connectDB from './config/database';
import authRoutes from './routes/auth';
import mediaRoutes from './routes/media';
import securityRoutes from './routes/security';
import legalRoutes from './routes/legal';
import postRoutes from './routes/post';
import { setupSocket } from './socket/chatHandler';
import { setupPrivateSocket } from './socket/privateHandler';
import { initializeFirebaseAdmin, isFirebaseAdminReady } from './services/notifications';
import userRoutes from './routes/user';
import privateRoutes from './routes/private';
import storyRoutes from './routes/story';
import aiRoutes from './routes/ai';
import admin from 'firebase-admin';
import User from './models/User';

dotenv.config({ override: true });

const app = express();
app.set('trust proxy', 1);
const httpServer = createServer(app);
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((v) => v.trim())
  .filter(Boolean);

const isOriginAllowed = (origin?: string): boolean => {
  if (!origin) return true;
  if (allowedOrigins.length === 0) return true;
  return allowedOrigins.includes(origin);
};

const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'), false);
    },
    methods: ['GET', 'POST'],
    credentials: false,
  },
});

const PORT = process.env.PORT || '10000';
const HOST = process.env.HOST || '0.0.0.0';

// Security middleware
app.use(helmet()); // Sets security headers

// Request logging
app.use(requestLogger);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use(limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Production-ready CORS configuration for mobile apps
const corsOptions = {
  origin: (origin: any, callback: any) => {
    if (isOriginAllowed(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'), false);
  },
  credentials: false,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
};
app.use(cors(corsOptions));

app.use(express.json());

app.use(mongoSanitize()); // Prevent MongoDB Operator Injection

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/legal', legalRoutes);
app.use('/api/user', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/private', privateRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/ai', aiRoutes);

// Production-ready health check endpoints
app.get('/', (req, res) => {
  res.json({ 
    message: 'ChatBull API is running!',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// API-prefixed health check (for monitoring tools)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'ChatBull Backend',
    timestamp: new Date().toISOString()
  });
});

// Extended health check with database connectivity
app.get('/health/extended', async (req, res) => {
  try {
    // Check database connection
    const dbState = require('./config/database').getDbState?.() || 'unknown';
    
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      services: {
        database: dbState === 'connected' ? 'healthy' : 'unhealthy',
        firebase: isFirebaseAdminReady() ? 'healthy' : 'unhealthy'
      },
      uptime: process.uptime(),
      memory: process.memoryUsage()
    });
  } catch (error: any) {
    res.status(503).json({
      status: 'UNHEALTHY',
      error: error.message || 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

app.use(errorHandler);

// Setup Socket.IO
io.use(async (socket, next) => {
  try {
    // if ((socket as any).nsp?.name === '/private') return next();

    const token =
      (socket.handshake.auth as any)?.token ||
      (typeof socket.handshake.headers.authorization === 'string'
        ? socket.handshake.headers.authorization.replace(/^Bearer\s+/i, '').trim()
        : '');

    if (!token) return next(new Error('unauthorized'));
    if (!isFirebaseAdminReady()) return next(new Error('auth_unavailable'));

    const decoded = await admin.auth().verifyIdToken(token);
    const user = await User.findOne({ firebaseUid: decoded.uid });

    if (!user) return next(new Error('user_not_found'));

    (socket.data as any).userId = user._id.toString();
    (socket.data as any).displayName = user.displayName;

    return next();
  } catch {
    return next(new Error('unauthorized'));
  }
});

setupSocket(io);
setupPrivateSocket(io);

import os from 'os';

// Helper function to get local IP addresses
const getLocalIPAddresses = (): string[] => {
  const interfaces = os.networkInterfaces();
  const ipAddresses: string[] = [];
  
  Object.keys(interfaces).forEach(interfaceName => {
    const iface = interfaces[interfaceName];
    
    if (iface) {  // Add null check
      iface.forEach((alias) => {
        if (alias.family === 'IPv4' && !alias.internal && !alias.address.startsWith('127.')) {
          ipAddresses.push(alias.address);
        }
      });
    }
  });
  
  return ipAddresses;
};

// Start server
const startServer = async () => {
  try {
    await connectDB();
    
    // Initialize Firebase Admin for push notifications
    initializeFirebaseAdmin();
    
    httpServer.listen(Number(PORT), HOST, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Socket.IO ready for connections`);
      console.log(`Server accessible at: http://${HOST}:${PORT}/`);
      
      // Only log local IPs in development
      if (process.env.NODE_ENV !== 'production') {
        const localIPs = getLocalIPAddresses();
        console.log(`Server accessible at:`);
        console.log(`  - http://localhost:${PORT}`);
        console.log(`  - http://127.0.0.1:${PORT}`);
        localIPs.forEach(ip => {
          console.log(`  - http://${ip}:${PORT}`);
        });
        console.log(`  - http://${HOST}:${PORT} (internal)`);
      }
    });
    
    httpServer.on('error', (err) => {
      console.error('Server error:', err);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
