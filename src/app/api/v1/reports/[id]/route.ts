import { NextResponse, type NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { apiHandler } from '@/lib/apiHandler';
import { validateData } from '@/lib/validate';
import { successBody } from '@/shared/utils/ApiResponse';
import * as analysisService from '@/modules/analysis/analysis.service';
import { analysisIdParamSchema } from '@/modules/analysis/analysis.validation';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// Fully public — no auth, no ownership check. Backs the "Share Report" link.
export const GET = apiHandler<RouteContext>(
  async (_request: NextRequest, { params }) => {
    await connectDB();
    const { id } = validateData(analysisIdParamSchema, await params);
    const report = await analysisService.getPublicReport(id);
    return NextResponse.json(successBody({ report }), { status: 200 });
  },
  { public: true },
);
