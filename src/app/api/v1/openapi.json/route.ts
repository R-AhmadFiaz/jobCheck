import { NextResponse, type NextRequest } from 'next/server';
import { apiHandler } from '@/lib/apiHandler';
import { authenticate, requireRole } from '@/lib/authGuard';
import { openApiSpec } from '@/lib/openapi/spec';

// Admin-only, same gating pattern as every other admin route (see
// src/app/api/v1/admin/scam-rules/route.ts) — no DB access needed since the
// spec is a static, hand-maintained document.
export const GET = apiHandler(async (request: NextRequest) => {
  const requester = authenticate(request);
  requireRole(requester, 'admin');

  return NextResponse.json(openApiSpec, { status: 200 });
});
