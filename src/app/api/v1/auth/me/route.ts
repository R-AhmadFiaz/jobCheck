import { NextResponse, type NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { apiHandler } from '@/lib/apiHandler';
import { authenticate } from '@/lib/authGuard';
import { successBody } from '@/shared/utils/ApiResponse';
import * as authService from '@/modules/auth/auth.service';

export const GET = apiHandler(async (request: NextRequest) => {
  await connectDB();
  const requester = authenticate(request);
  const user = await authService.getUserById(requester.userId);
  return NextResponse.json(successBody({ user }), { status: 200 });
});
