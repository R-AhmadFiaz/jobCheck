import { Router } from 'express';
import { authenticate } from '@/shared/middlewares/auth.middleware';
import { requireRole } from '@/shared/middlewares/role.middleware';
import { validate } from '@/shared/middlewares/validate.middleware';
import {
  searchKnowledgeQuerySchema,
  listKnowledgeQuerySchema,
  knowledgeEntryIdParamSchema,
  createKnowledgeEntrySchema,
  updateKnowledgeEntrySchema,
} from '@/modules/knowledgeBase/knowledgeBase.validation';
import {
  search,
  list,
  getById,
  create,
  update,
} from '@/modules/knowledgeBase/knowledgeBase.controller';

export const knowledgeBaseRouter = Router();

knowledgeBaseRouter.use('/knowledge-base', authenticate);

// Must precede '/knowledge-base/:id' — otherwise Express matches ':id' first
// and 'search' fails the ObjectId param validation.
knowledgeBaseRouter.get(
  '/knowledge-base/search',
  validate(searchKnowledgeQuerySchema, 'query'),
  search,
);

knowledgeBaseRouter.get('/knowledge-base', validate(listKnowledgeQuerySchema, 'query'), list);

knowledgeBaseRouter.get(
  '/knowledge-base/:id',
  validate(knowledgeEntryIdParamSchema, 'params'),
  getById,
);

knowledgeBaseRouter.post(
  '/knowledge-base',
  requireRole('admin'),
  validate(createKnowledgeEntrySchema),
  create,
);

knowledgeBaseRouter.patch(
  '/knowledge-base/:id',
  requireRole('admin'),
  validate(knowledgeEntryIdParamSchema, 'params'),
  validate(updateKnowledgeEntrySchema),
  update,
);
