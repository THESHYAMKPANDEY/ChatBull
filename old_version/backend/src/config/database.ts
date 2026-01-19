import mongoose from 'mongoose';
import dns from 'dns';
import { logger } from '../utils/logger';
import User from '../models/User';
import Post from '../models/Post';
import Message from '../models/Message';
import PrivateMessage from '../models/PrivateMessage';
import EphemeralSession from '../models/EphemeralSession';
import AIMessage from '../models/AIMessage';
import SecurityEvent from '../models/SecurityEvent';
import Group from '../models/Group';

// Use Google DNS to fix SRV lookup issues
dns.setServers(['8.8.8.8', '8.8.4.4']);

const connectDB = async (): Promise<void> => {
  try {
    // In Render deployment, we log connection attempt (without secrets)
    const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI;

    if (!mongoURI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    mongoose.set('strictQuery', true);

    const conn = await mongoose.connect(mongoURI);
    logger.info('MongoDB connected', { host: conn.connection.host });

    const shouldSyncIndexes = String(process.env.MONGODB_SYNC_INDEXES || '').toLowerCase() === 'true';
    if (shouldSyncIndexes) {
      logger.info('MongoDB syncing indexes');
      await Promise.all([
        User.syncIndexes(),
        Post.syncIndexes(),
        Message.syncIndexes(),
        PrivateMessage.syncIndexes(),
        EphemeralSession.syncIndexes(),
        AIMessage.syncIndexes(),
        SecurityEvent.syncIndexes(),
        Group.syncIndexes(),
      ]);
      logger.info('MongoDB indexes synced');
    }
  } catch (error) {
    const errorMessage = (error as any)?.message || String(error);
    logger.error('MongoDB connection error', { message: errorMessage });
    
    // Proactive hint for common auth issues
    if (errorMessage.includes('bad auth') || errorMessage.includes('authentication failed')) {
      logger.error('HINT: Check if your MongoDB password contains special characters (@, :, etc). If so, they must be URL encoded in the connection string.');
    }
    
    process.exit(1);
  }
};

export default connectDB;
