import type { Response } from 'express';

export function sendSuccess<T>(res: Response, statusCode: number, data: T): Response {
  return res.status(statusCode).json({
    success: true,
    data,
  });
}
