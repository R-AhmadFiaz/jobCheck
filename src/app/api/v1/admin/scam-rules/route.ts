import { NextResponse, type NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { apiHandler } from '@/lib/apiHandler';
import { authenticate, requireRole } from '@/lib/authGuard';
import { validateData } from '@/lib/validate';
import { readJsonBody } from '@/lib/readJsonBody';
import { successBody } from '@/shared/utils/ApiResponse';
import * as adminService from '@/modules/admin/admin.service';
import { createScamRuleSchema, listScamRulesQuerySchema } from '@/modules/admin/admin.validation';

export const GET = apiHandler(async (request: NextRequest) => {
  const requester = authenticate(request);
  requireRole(requester, 'admin');
  await connectDB();

  const sp = request.nextUrl.searchParams;
  const query = validateData(listScamRulesQuerySchema, {
    isActive: sp.get('isActive') ?? undefined,
    category: sp.get('category') ?? undefined,
    severity: sp.get('severity') ?? undefined,
    page: sp.get('page') ?? undefined,
    limit: sp.get('limit') ?? undefined,
    sortBy: sp.get('sortBy') ?? undefined,
    sortOrder: sp.get('sortOrder') ?? undefined,
  });

  const result = await adminService.listScamRules(query);
  return NextResponse.json(successBody(result), { status: 200 });
});

export const POST = apiHandler(async (request: NextRequest) => {
  const requester = authenticate(request);
  requireRole(requester, 'admin');
  await connectDB();

  const input = validateData(createScamRuleSchema, await readJsonBody(request));
  const rule = await adminService.createScamRule(input);
  return NextResponse.json(successBody({ rule }), { status: 201 });
});
