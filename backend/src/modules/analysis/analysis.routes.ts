import { Router } from 'express';
import { authenticate } from '@/shared/middlewares/auth.middleware';
import { validate } from '@/shared/middlewares/validate.middleware';
import {
  createAnalysisSchema,
  listAnalysesQuerySchema,
  analysisIdParamSchema,
} from '@/modules/analysis/analysis.validation';
import { create, getById, getHistory } from '@/modules/analysis/analysis.controller';

export const analysisRouter = Router();

analysisRouter.post('/analyses', authenticate, validate(createAnalysisSchema), create);
analysisRouter.get(
  '/analyses',
  authenticate,
  validate(listAnalysesQuerySchema, 'query'),
  getHistory,
);
analysisRouter.get(
  '/analyses/:id',
  authenticate,
  validate(analysisIdParamSchema, 'params'),
  getById,
);
