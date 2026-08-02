import type { Request, Response } from 'express';
import { asyncHandler } from '@/shared/utils/asyncHandler';
import { sendSuccess } from '@/shared/utils/ApiResponse';
import * as knowledgeBaseService from '@/modules/knowledgeBase/knowledgeBase.service';
import type {
  SearchKnowledgeQuery,
  ListKnowledgeQuery,
  CreateKnowledgeEntryInput,
  UpdateKnowledgeEntryInput,
} from '@/modules/knowledgeBase/knowledgeBase.validation';

export const search = asyncHandler(async (req: Request, res: Response) => {
  const { type, q } = req.query as unknown as SearchKnowledgeQuery;
  const result = await knowledgeBaseService.searchEntries(type, q);
  sendSuccess(res, 200, result);
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListKnowledgeQuery;
  const result = await knowledgeBaseService.listEntries(query);
  sendSuccess(res, 200, result);
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const entry = await knowledgeBaseService.getEntryById(req.params.id!);
  sendSuccess(res, 200, { entry });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as CreateKnowledgeEntryInput;
  const entry = await knowledgeBaseService.createEntry(input);
  sendSuccess(res, 201, { entry });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as UpdateKnowledgeEntryInput;
  const entry = await knowledgeBaseService.updateEntry(req.params.id!, input);
  sendSuccess(res, 200, { entry });
});
