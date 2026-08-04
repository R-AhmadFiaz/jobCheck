import { NextResponse, type NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { apiHandler } from '@/lib/apiHandler';
import { authenticate } from '@/lib/authGuard';
import { validateData } from '@/lib/validate';
import { readJsonBody } from '@/lib/readJsonBody';
import { checkAuthenticatedAnalysisRateLimit } from '@/lib/rateLimit/rateLimit';
import { successBody } from '@/shared/utils/ApiResponse';
import * as analysisService from '@/modules/analysis/analysis.service';
import { createAnalysisSchema, listAnalysesQuerySchema } from '@/modules/analysis/analysis.validation';

export const POST = apiHandler(async (request: NextRequest) => {
  const requester = authenticate(request);
  await checkAuthenticatedAnalysisRateLimit(requester.userId);
  await connectDB();

  const input = validateData(createAnalysisSchema, await readJsonBody(request));
  const result = await analysisService.createAnalysis(requester.userId, input);
  return NextResponse.json(successBody(result), { status: 201 });
});

export const GET = apiHandler(async (request: NextRequest) => {
  const requester = authenticate(request);
  await connectDB();

  const searchParams = request.nextUrl.searchParams;
  const { page, limit } = validateData(listAnalysesQuerySchema, {
    page: searchParams.get('page') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
  });

  const result = await analysisService.getAnalysisHistory(requester.userId, page, limit);
  return NextResponse.json(successBody(result), { status: 200 });
});
