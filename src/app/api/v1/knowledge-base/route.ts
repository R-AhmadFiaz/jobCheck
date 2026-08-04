import { NextResponse, type NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { apiHandler } from '@/lib/apiHandler';
import { authenticate, requireRole } from '@/lib/authGuard';
import { validateData } from '@/lib/validate';
import { readJsonBody } from '@/lib/readJsonBody';
import { successBody } from '@/shared/utils/ApiResponse';
import * as knowledgeBaseService from '@/modules/knowledgeBase/knowledgeBase.service';
import {
  listKnowledgeQuerySchema,
  createKnowledgeEntrySchema,
} from '@/modules/knowledgeBase/knowledgeBase.validation';

export const GET = apiHandler(async (request: NextRequest) => {
  authenticate(request);
  await connectDB();

  const sp = request.nextUrl.searchParams;
  const query = validateData(listKnowledgeQuerySchema, {
    type: sp.get('type') ?? undefined,
    riskLevel: sp.get('riskLevel') ?? undefined,
    verificationStatus: sp.get('verificationStatus') ?? undefined,
    page: sp.get('page') ?? undefined,
    limit: sp.get('limit') ?? undefined,
  });

  const result = await knowledgeBaseService.listEntries(query);
  return NextResponse.json(successBody(result), { status: 200 });
});

export const POST = apiHandler(async (request: NextRequest) => {
  const requester = authenticate(request);
  requireRole(requester, 'admin');
  await connectDB();

  const input = validateData(createKnowledgeEntrySchema, await readJsonBody(request));
  const entry = await knowledgeBaseService.createEntry(input);
  return NextResponse.json(successBody({ entry }), { status: 201 });
});
