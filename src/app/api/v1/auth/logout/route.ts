import { NextResponse, type NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { apiHandler } from '@/lib/apiHandler';
import { clearRefreshTokenCookie, REFRESH_TOKEN_COOKIE } from '@/lib/authCookie';
import { successBody } from '@/shared/utils/ApiResponse';
import * as authService from '@/modules/auth/auth.service';

export const POST = apiHandler(async (request: NextRequest) => {
  await connectDB();
  const rawRefreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  await authService.logoutUser(rawRefreshToken);

  const response = NextResponse.json(successBody({ message: 'Logged out successfully' }), {
    status: 200,
  });
  clearRefreshTokenCookie(response);
  return response;
});
