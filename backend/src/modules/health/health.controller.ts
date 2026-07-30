import type { Request, Response } from 'express';
import { getDbState } from '@/db/connection';
import { env } from '@/config/env';
import { sendSuccess } from '@/shared/utils/ApiResponse';

export function getHealth(_req: Request, res: Response): void {
  sendSuccess(res, 200, {
    status: 'ok',
    environment: env.NODE_ENV,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    db: getDbState(),
  });
}
