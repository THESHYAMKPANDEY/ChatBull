import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { requestLogger, errorHandler } from './utils/logger';
import { createServer } from 'http';
import { Server } from 'socket.io';
import connectDB from './config/database';
import authRoutes from './routes/auth';
import testRoutes from './routes/test';
import mediaRoutes from './routes/media';
import securityRoutes from './routes/security';
import legalRoutes from './routes/legal';
import postRoutes from './routes/post';
import { setupSocket } from './socket/chatHandler';
import { setupPrivateSocket } from './socket/privateHandler';
import { initializeFirebaseAdmin } from './services/notifications';
import userRoutes from './routes/user';
import privateRoutes from './routes/private';

dotenv.config({ override: true });

const app = express();
app.set('trust proxy', 1);
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
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

// Production-ready CORS configuration for mobile apps
const corsOptions = {
  origin: [
    'exp://*', // Expo Go
    'http://localhost:*', // Local development
    'http://127.0.0.1:*', // Local development
    'http://192.168.*:*', // LAN access
    'http://10.*:*', // LAN access
    'http://172.16.*:*', // LAN access
    'http://172.17.*:*', // LAN access
    'http://172.18.*:*', // LAN access
    'http://172.19.*:*', // LAN access
    'http://172.20.*:*', // LAN access
    'http://172.21.*:*', // LAN access
    'http://172.22.*:*', // LAN access
    'http://172.23.*:*', // LAN access
    'http://172.24.*:*', // LAN access
    'http://172.25.*:*', // LAN access
    'http://172.26.*:*', // LAN access
    'http://172.27.*:*', // LAN access
    'http://172.28.*:*', // LAN access
    'http://172.29.*:*', // LAN access
    'http://172.30.*:*', // LAN access
    'http://172.31.*:*', // LAN access
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

app.use(express.json());

// Error handling middleware
app.use(errorHandler);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/test', testRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/legal', legalRoutes);
app.use('/api/user', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/private', privateRoutes);

// Production-ready health check endpoints
app.get('/', (req, res) => {
  res.json({ 
    message: 'Social Chat API is running!',
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
        firebase: require('./services/notifications').isFirebaseAdminReady() ? 'healthy' : 'unhealthy'
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

// Setup Socket.IO
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
