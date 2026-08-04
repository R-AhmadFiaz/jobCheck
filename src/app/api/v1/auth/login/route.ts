import { NextResponse, type NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { apiHandler } from '@/lib/apiHandler';
import { validateData } from '@/lib/validate';
import { readJsonBody } from '@/lib/readJsonBody';
import { setRefreshTokenCookie } from '@/lib/authCookie';
import { getClientIp } from '@/lib/getClientIp';
import { checkLoginRateLimit } from '@/lib/rateLimit/rateLimit';
import { successBody } from '@/shared/utils/ApiResponse';
import * as authService from '@/modules/auth/auth.service';
import { loginSchema } from '@/modules/auth/auth.validation';
import type { RequestMeta } from '@/modules/auth/auth.types';

function getRequestMeta(request: NextRequest): RequestMeta {
  return {
    userAgent: request.headers.get('user-agent'),
    ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
  };
}

export const POST = apiHandler(async (request: NextRequest) => {
  await checkLoginRateLimit(getClientIp(request));
  await connectDB();
  const input = validateData(loginSchema, await readJsonBody(request));
  const { user, accessToken, refreshToken } = await authService.loginUser(
    input,
    getRequestMeta(request),
  );

  const response = NextResponse.json(successBody({ user, accessToken }), { status: 200 });
  setRefreshTokenCookie(response, refreshToken);
  return response;
});
