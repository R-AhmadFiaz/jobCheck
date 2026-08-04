import { NextResponse, type NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { apiHandler } from '@/lib/apiHandler';
import { optionalAuthenticate } from '@/lib/authGuard';
import { validateData } from '@/lib/validate';
import { successBody } from '@/shared/utils/ApiResponse';
import * as analysisService from '@/modules/analysis/analysis.service';
import { analysisIdParamSchema } from '@/modules/analysis/analysis.validation';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// Optional auth: this id may belong to a guest run (userId: null), which
// anyone can view — see analysisService.getAnalysisById's own access check.
export const GET = apiHandler<RouteContext>(async (request: NextRequest, { params }) => {
  await connectDB();
  const requester = optionalAuthenticate(request);
  const { id } = validateData(analysisIdParamSchema, await params);

  const result = await analysisService.getAnalysisById(id, requester);
  return NextResponse.json(successBody(result), { status: 200 });
});
