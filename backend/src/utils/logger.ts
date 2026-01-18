import fs from 'fs';
import path from 'path';
import { Request, Response, NextFunction } from 'express';

const enableFileLogging = process.env.NODE_ENV === 'development';
let logStream: fs.WriteStream | null = null;

if (enableFileLogging) {
  const logsDir = path.join(__dirname, '../../logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  const logFilePath = path.join(logsDir, `server-${new Date().toISOString().split('T')[0]}.log`);
  logStream = fs.createWriteStream(logFilePath, { flags: 'a' });
}

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

const sanitizeMeta = (meta: any): any => {
  if (!meta || typeof meta !== 'object') return meta;
  const copy: any = Array.isArray(meta) ? [...meta] : { ...meta };
  if (copy.authorization) copy.authorization = '[REDACTED]';
  if (copy.headers?.authorization) copy.headers = { ...copy.headers, authorization: '[REDACTED]' };
  if (copy.body) {
    if (typeof copy.body === 'object' && copy.body !== null) {
      copy.bodyKeys = Object.keys(copy.body);
    }
    delete copy.body;
  }
  return copy;
};

// Write log to file
const writeLog = (level: LogLevel, message: string, meta?: any): void => {
  const logEntry = formatLog(level, message, sanitizeMeta(meta));
  logStream?.write(logEntry + '\n');
  if (process.env.NODE_ENV !== 'test') {
    console.log(logEntry);
  }
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
    params: req.params,
    ...(process.env.NODE_ENV !== 'production' ? { stack: err.stack, body: req.body } : {}),
  });
  
  // Send generic error response
  res.status(500).json({
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { details: err.message }),
  });
};
