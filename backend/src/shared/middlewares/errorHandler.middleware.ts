import type { NextFunction, Request, Response } from 'express';
import { MulterError } from 'multer';
import { env } from '@/config/env';
import { ApiError } from '@/shared/utils/ApiError';
import { logger } from '@/shared/utils/logger';

// Multer raises its own error class (file too large, too many files, etc.)
// rather than an ApiError — translated here so uploads fail with a clean 400
// instead of falling through to the generic 500 branch below.
function normalizeMulterError(err: Error): Error {
  if (!(err instanceof MulterError)) return err;

  const message =
    err.code === 'LIMIT_FILE_SIZE'
      ? 'Uploaded file is too large.'
      : 'Could not process the uploaded file.';
  return new ApiError(400, message);
}

export function errorHandler(
  rawErr: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const err = normalizeMulterError(rawErr);
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
