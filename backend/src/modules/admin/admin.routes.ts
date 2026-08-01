import { Router } from 'express';
import { authenticate } from '@/shared/middlewares/auth.middleware';
import { requireRole } from '@/shared/middlewares/role.middleware';
import { validate } from '@/shared/middlewares/validate.middleware';
import {
  createScamRuleSchema,
  updateScamRuleSchema,
  listScamRulesQuerySchema,
  scamRuleIdParamSchema,
} from '@/modules/admin/admin.validation';
import {
  listScamRules,
  createScamRule,
  updateScamRule,
  deleteScamRule,
} from '@/modules/admin/admin.controller';

export const adminRouter = Router();

adminRouter.use('/admin', authenticate, requireRole('admin'));

adminRouter.get('/admin/scam-rules', validate(listScamRulesQuerySchema, 'query'), listScamRules);
adminRouter.post('/admin/scam-rules', validate(createScamRuleSchema), createScamRule);
adminRouter.patch(
  '/admin/scam-rules/:id',
  validate(scamRuleIdParamSchema, 'params'),
  validate(updateScamRuleSchema),
  updateScamRule,
);
adminRouter.delete(
  '/admin/scam-rules/:id',
  validate(scamRuleIdParamSchema, 'params'),
  deleteScamRule,
);
