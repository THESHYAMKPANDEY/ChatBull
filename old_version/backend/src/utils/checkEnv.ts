import { logger } from './logger';

export const checkEnv = () => {
  const required = [
    'MONGODB_URI',
    'FIREBASE_SERVICE_ACCOUNT_JSON',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    logger.error('CRITICAL: Missing required environment variables', { missing });
    logger.error('The server cannot start without these variables.');
    logger.error('If you are on Render, go to Dashboard -> Environment and add them.');
    
    // We allow the process to continue in development for easier debugging, 
    // but in production, this should likely fail. 
    // However, failing immediately might hide the logs in some systems.
    // We'll log loudly and exit.
    process.exit(1);
  }
  
  logger.info('Environment variables check passed.');
};
