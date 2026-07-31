import type { Request, Response } from 'express';
import { asyncHandler } from '@/shared/utils/asyncHandler';
import { sendSuccess } from '@/shared/utils/ApiResponse';
import * as analysisService from '@/modules/analysis/analysis.service';
import type {
  CreateAnalysisInput,
  ListAnalysesQuery,
} from '@/modules/analysis/analysis.validation';

export const create = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as CreateAnalysisInput;
  const result = await analysisService.createAnalysis(req.user!.userId, input);
  sendSuccess(res, 201, result);
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const result = await analysisService.getAnalysisById(req.params.id!, req.user!);
  sendSuccess(res, 200, result);
});

export const getHistory = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = req.query as unknown as ListAnalysesQuery;
  const result = await analysisService.getAnalysisHistory(req.user!.userId, page, limit);
  sendSuccess(res, 200, result);
});
