import fs from 'fs';
import path from 'path';
import { Request, Response, NextFunction } from 'express';

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logFilePath = path.join(logsDir, `server-${new Date().toISOString().split('T')[0]}.log`);

// Log levels
type LogLevel = 'info' | 'warn' | 'error' | 'debug';

// Format log entry
const formatLog = (level: LogLevel, message: string, meta?: any): string => {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  
  if (meta) {
    return `${logEntry} ${JSON.stringify(meta, null, 2)}`;
  }
  
  return logEntry;
};

// Write log to file
const writeLog = (level: LogLevel, message: string, meta?: any): void => {
  const logEntry = formatLog(level, message, meta);
  fs.appendFileSync(logFilePath, logEntry + '\n');
  console.log(logEntry); // Also log to console
};

// Logger object
export const logger = {
  info: (message: string, meta?: any) => writeLog('info', message, meta),
  warn: (message: string, meta?: any) => writeLog('warn', message, meta),
  error: (message: string, meta?: any) => writeLog('error', message, meta),
  debug: (message: string, meta?: any) => writeLog('debug', message, meta),
};

// Middleware to log requests
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info(`${req.method} ${req.path}`, {
      statusCode: res.statusCode,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      duration: `${duration}ms`,
      contentLength: res.get('Content-Length'),
    });
  });
  
  next();
};

// Error logging middleware
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error(`Unhandled error: ${err.message}`, {
    url: req.url,
    method: req.method,
    body: req.body,
    params: req.params,
    stack: err.stack,
  });
  
  // Send generic error response
  res.status(500).json({
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { details: err.message }),
  });
};