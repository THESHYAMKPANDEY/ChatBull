import mongoose from 'mongoose';
import dns from 'dns';

// Use Google DNS to fix SRV lookup issues
dns.setServers(['8.8.8.8', '8.8.4.4']);

const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI;

    console.log('MongoDB URI debug:', {
      hasValue: !!mongoURI,
      startsWithSrv: mongoURI?.startsWith('mongodb+srv://') || false,
      includesLocalhost: mongoURI?.includes('localhost') || false,
    });

    if (!mongoURI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    const conn = await mongoose.connect(mongoURI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

export default connectDB;
