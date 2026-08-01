import type { Request, Response } from 'express';
import { asyncHandler } from '@/shared/utils/asyncHandler';
import { sendSuccess } from '@/shared/utils/ApiResponse';
import * as adminService from '@/modules/admin/admin.service';
import type {
  CreateScamRuleInput,
  UpdateScamRuleInput,
  ListScamRulesQuery,
} from '@/modules/admin/admin.validation';

export const listScamRules = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListScamRulesQuery;
  const result = await adminService.listScamRules(query);
  sendSuccess(res, 200, result);
});

export const createScamRule = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as CreateScamRuleInput;
  const rule = await adminService.createScamRule(input);
  sendSuccess(res, 201, { rule });
});

export const updateScamRule = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as UpdateScamRuleInput;
  const rule = await adminService.updateScamRule(req.params.id!, input);
  sendSuccess(res, 200, { rule });
});

export const deleteScamRule = asyncHandler(async (req: Request, res: Response) => {
  await adminService.deleteScamRule(req.params.id!);
  sendSuccess(res, 200, { message: 'Scam rule deleted successfully' });
});
