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
    // Check if the variable is empty string vs undefined
    const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI;
    
    if (mongoURI === undefined) {
      console.error('❌ FATAL: MONGODB_URI is strictly UNDEFINED in process.env');
      console.log('Environment keys available:', Object.keys(process.env).filter(k => !k.includes('KEY') && !k.includes('SECRET')));
    } else if (mongoURI === '') {
      console.error('❌ FATAL: MONGODB_URI is set but EMPTY (empty string)');
    } else {
      console.log('✅ MONGODB_URI is present (length: ' + mongoURI.length + ')');
    }

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
    logger.error('MongoDB connection error', { message: (error as any)?.message || String(error) });
    process.exit(1);
  }
};

export default connectDB;
