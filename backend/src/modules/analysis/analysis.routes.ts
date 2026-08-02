import { Router } from 'express';
import { authenticate } from '@/shared/middlewares/auth.middleware';
import { optionalAuthenticate } from '@/shared/middlewares/optionalAuth.middleware';
import { validate } from '@/shared/middlewares/validate.middleware';
import { uploadAnalysisFile } from '@/shared/middlewares/upload.middleware';
import { publicAnalysisRateLimiter } from '@/shared/middlewares/rateLimiter.middleware';
import {
  createAnalysisSchema,
  listAnalysesQuerySchema,
  analysisIdParamSchema,
  publicAnalysisBodySchema,
} from '@/modules/analysis/analysis.validation';
import {
  create,
  analyzePublic,
  getById,
  getPublicReport,
  getHistory,
} from '@/modules/analysis/analysis.controller';

export const analysisRouter = Router();

analysisRouter.post('/analyses', authenticate, validate(createAnalysisSchema), create);
analysisRouter.get(
  '/analyses',
  authenticate,
  validate(listAnalysesQuerySchema, 'query'),
  getHistory,
);
// Optional auth, not `authenticate`: this id may belong to a guest run
// (userId: null), which anyone can view — see getAnalysisById's access check.
analysisRouter.get(
  '/analyses/:id',
  optionalAuthenticate,
  validate(analysisIdParamSchema, 'params'),
  getById,
);

// Guest/anonymous entry point — no auth, IP rate-limited, multipart so it can
// accept a file alongside url/description.
analysisRouter.post(
  '/analyze/public',
  publicAnalysisRateLimiter,
  uploadAnalysisFile,
  validate(publicAnalysisBodySchema),
  analyzePublic,
);

// Fully public "Share Report" link — no auth at all, works for ANY analysis
// id (guest or an authenticated user's own). Returns a redacted DTO (see
// getPublicReport), never the full document /analyses/:id returns.
analysisRouter.get('/reports/:id', validate(analysisIdParamSchema, 'params'), getPublicReport);
