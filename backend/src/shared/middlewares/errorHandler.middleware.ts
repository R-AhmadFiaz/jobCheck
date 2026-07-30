import type { NextFunction, Request, Response } from 'express';
import { env } from '@/config/env';
import { ApiError } from '@/shared/utils/ApiError';
import { logger } from '@/shared/utils/logger';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  const isApiError = err instanceof ApiError;
  const statusCode = isApiError ? err.statusCode : 500;
  const message = isApiError && err.isOperational ? err.message : 'Internal server error';

  if (!isApiError || !err.isOperational) {
    logger.error({ err, path: req.originalUrl, method: req.method }, 'Unhandled error');
  } else {
    logger.warn({ path: req.originalUrl, method: req.method }, err.message);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(env.isDevelopment && !isApiError ? { stack: err.stack } : {}),
    },
  });
}
