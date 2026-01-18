import { Request, Response, NextFunction } from 'express';

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const sanitizeObject = (obj: Record<string, unknown>) => {
  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key.includes('.')) {
      delete obj[key];
      continue;
    }

    const child = obj[key];
    if (Array.isArray(child)) {
      for (const item of child) {
        if (isPlainObject(item)) sanitizeObject(item);
      }
      continue;
    }

    if (isPlainObject(child)) {
      sanitizeObject(child);
    }
  }
};

export const noSqlSanitize = (req: Request, _res: Response, next: NextFunction) => {
  if (isPlainObject(req.body as any)) sanitizeObject(req.body as any);
  if (isPlainObject(req.params as any)) sanitizeObject(req.params as any);

  const query = (req as any).query;
  if (isPlainObject(query)) sanitizeObject(query);

  next();
};

