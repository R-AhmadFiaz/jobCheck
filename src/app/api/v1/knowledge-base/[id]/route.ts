import { NextResponse, type NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { apiHandler } from '@/lib/apiHandler';
import { authenticate, requireRole } from '@/lib/authGuard';
import { validateData } from '@/lib/validate';
import { readJsonBody } from '@/lib/readJsonBody';
import { successBody } from '@/shared/utils/ApiResponse';
import * as knowledgeBaseService from '@/modules/knowledgeBase/knowledgeBase.service';
import {
  knowledgeEntryIdParamSchema,
  updateKnowledgeEntrySchema,
} from '@/modules/knowledgeBase/knowledgeBase.validation';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const GET = apiHandler<RouteContext>(async (request: NextRequest, { params }) => {
  authenticate(request);
  await connectDB();

  const { id } = validateData(knowledgeEntryIdParamSchema, await params);
  const entry = await knowledgeBaseService.getEntryById(id);
  return NextResponse.json(successBody({ entry }), { status: 200 });
});

export const PATCH = apiHandler<RouteContext>(async (request: NextRequest, { params }) => {
  const requester = authenticate(request);
  requireRole(requester, 'admin');
  await connectDB();

  const { id } = validateData(knowledgeEntryIdParamSchema, await params);
  const input = validateData(updateKnowledgeEntrySchema, await readJsonBody(request));
  const entry = await knowledgeBaseService.updateEntry(id, input);
  return NextResponse.json(successBody({ entry }), { status: 200 });
});
