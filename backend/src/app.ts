import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Application } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { API_PREFIX } from '@/config/constants';
import { env } from '@/config/env';
import { adminRouter } from '@/modules/admin/admin.routes';
import { analysisRouter } from '@/modules/analysis/analysis.routes';
import { authRouter } from '@/modules/auth/auth.routes';
import { healthRouter } from '@/modules/health/health.routes';
import { errorHandler } from '@/shared/middlewares/errorHandler.middleware';
import { notFoundHandler } from '@/shared/middlewares/notFound.middleware';
import { logger } from '@/shared/utils/logger';

export function createApp(): Application {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.clientOrigins,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '10kb' }));
  app.use(cookieParser());
  app.use(pinoHttp({ logger }));

  app.use(API_PREFIX, healthRouter);
  app.use(API_PREFIX, authRouter);
  app.use(API_PREFIX, analysisRouter);
  app.use(API_PREFIX, adminRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
