import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth';
// import testRoutes from './routes/test';
import mediaRoutes from './routes/media';
import securityRoutes from './routes/security';
import legalRoutes from './routes/legal';
import postRoutes from './routes/post';
import userRoutes from './routes/user';
import privateRoutes from './routes/private';
import storyRoutes from './routes/story';
import aiRoutes from './routes/ai';
import { requestLogger, errorHandler } from './utils/logger';
import { isFirebaseAdminReady } from './services/notifications';
import { verifyFirebaseToken } from './middleware/auth';

export const createApp = () => {
  const app = express();
  app.set('trust proxy', 1);

  const allowedOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

  const isOriginAllowed = (origin?: string): boolean => {
    if (!origin) return true;
    if (allowedOrigins.length === 0) return true;
    return allowedOrigins.includes(origin);
  };

  app.use(helmet());
  app.use(requestLogger);

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);

  app.use(
    cors({
      origin: (origin: any, callback: any) => {
        if (isOriginAllowed(origin)) return callback(null, true);
        return callback(new Error('Not allowed by CORS'), false);
      },
      credentials: false,
      optionsSuccessStatus: 200,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
    }),
  );

  app.use(express.json());

  app.use('/api/auth', authRoutes);
  if (process.env.NODE_ENV !== 'production') {
    // app.use('/api/test', testRoutes);
  }
  app.use('/api/media', verifyFirebaseToken, mediaRoutes);
  app.use('/api/security', securityRoutes);
  app.use('/api/legal', legalRoutes);
  app.use('/api/user', userRoutes);
  app.use('/api/posts', postRoutes);
  app.use('/api/private', privateRoutes);
  app.use('/api/stories', storyRoutes);
  app.use('/api/ai', aiRoutes);

  app.get('/', (req, res) => {
    res.json({
      message: 'Social Chat API is running!',
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    });
  });

  app.get('/api/health', (req, res) => {
    res.status(200).json({
      status: 'OK',
      service: 'ChatBull Backend',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/health/extended', async (req, res) => {
    try {
      const dbState = require('./config/database').getDbState?.() || 'unknown';

      res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        services: {
          database: dbState === 'connected' ? 'healthy' : 'unhealthy',
          firebase: isFirebaseAdminReady() ? 'healthy' : 'unhealthy',
        },
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      });
    } catch (error: any) {
      res.status(503).json({
        status: 'UNHEALTHY',
        error: error.message || 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  });

  app.use(errorHandler);

  return app;
};

