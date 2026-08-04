import { NextResponse, type NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { apiHandler } from '@/lib/apiHandler';
import { setRefreshTokenCookie, REFRESH_TOKEN_COOKIE } from '@/lib/authCookie';
import { successBody } from '@/shared/utils/ApiResponse';
import { ApiError } from '@/shared/utils/ApiError';
import * as authService from '@/modules/auth/auth.service';
import type { RequestMeta } from '@/modules/auth/auth.types';

function getRequestMeta(request: NextRequest): RequestMeta {
  return {
    userAgent: request.headers.get('user-agent'),
    ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
  };
}

export const POST = apiHandler(async (request: NextRequest) => {
  await connectDB();
  const rawRefreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  if (!rawRefreshToken) {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  const { accessToken, refreshToken } = await authService.refreshSession(
    rawRefreshToken,
    getRequestMeta(request),
  );

  const response = NextResponse.json(successBody({ accessToken }), { status: 200 });
  setRefreshTokenCookie(response, refreshToken);
  return response;
});
