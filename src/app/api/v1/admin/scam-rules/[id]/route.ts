import { NextResponse, type NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { apiHandler } from '@/lib/apiHandler';
import { authenticate, requireRole } from '@/lib/authGuard';
import { validateData } from '@/lib/validate';
import { readJsonBody } from '@/lib/readJsonBody';
import { successBody } from '@/shared/utils/ApiResponse';
import * as adminService from '@/modules/admin/admin.service';
import { updateScamRuleSchema, scamRuleIdParamSchema } from '@/modules/admin/admin.validation';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const PATCH = apiHandler<RouteContext>(async (request: NextRequest, { params }) => {
  const requester = authenticate(request);
  requireRole(requester, 'admin');
  await connectDB();

  const { id } = validateData(scamRuleIdParamSchema, await params);
  const input = validateData(updateScamRuleSchema, await readJsonBody(request));
  const rule = await adminService.updateScamRule(id, input);
  return NextResponse.json(successBody({ rule }), { status: 200 });
});

export const DELETE = apiHandler<RouteContext>(async (request: NextRequest, { params }) => {
  const requester = authenticate(request);
  requireRole(requester, 'admin');
  await connectDB();

  const { id } = validateData(scamRuleIdParamSchema, await params);
  await adminService.deleteScamRule(id);
  return NextResponse.json(successBody({ message: 'Scam rule deleted successfully' }), {
    status: 200,
  });
});
