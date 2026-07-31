import type { Request, Response } from 'express';
import { env } from '@/config/env';
import { asyncHandler } from '@/shared/utils/asyncHandler';
import { sendSuccess } from '@/shared/utils/ApiResponse';
import { ApiError } from '@/shared/utils/ApiError';
import * as authService from '@/modules/auth/auth.service';
import type { RequestMeta } from '@/modules/auth/auth.types';
import type { RegisterInput, LoginInput } from '@/modules/auth/auth.validation';

const REFRESH_TOKEN_COOKIE = 'refreshToken';
const REFRESH_TOKEN_COOKIE_PATH = '/api/v1/auth';

function setRefreshTokenCookie(res: Response, token: string): void {
  res.cookie(REFRESH_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'strict',
    path: REFRESH_TOKEN_COOKIE_PATH,
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
}

function clearRefreshTokenCookie(res: Response): void {
  res.clearCookie(REFRESH_TOKEN_COOKIE, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'strict',
    path: REFRESH_TOKEN_COOKIE_PATH,
  });
}

function getRequestMeta(req: Request): RequestMeta {
  return {
    userAgent: req.headers['user-agent'] ?? null,
    ipAddress: req.ip ?? null,
  };
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as RegisterInput;
  const { user, accessToken, refreshToken } = await authService.registerUser(
    input,
    getRequestMeta(req),
  );
  setRefreshTokenCookie(res, refreshToken);
  sendSuccess(res, 201, { user, accessToken });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as LoginInput;
  const { user, accessToken, refreshToken } = await authService.loginUser(
    input,
    getRequestMeta(req),
  );
  setRefreshTokenCookie(res, refreshToken);
  sendSuccess(res, 200, { user, accessToken });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const rawRefreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE] as string | undefined;
  if (!rawRefreshToken) {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  const { accessToken, refreshToken } = await authService.refreshSession(
    rawRefreshToken,
    getRequestMeta(req),
  );
  setRefreshTokenCookie(res, refreshToken);
  sendSuccess(res, 200, { accessToken });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const rawRefreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE] as string | undefined;
  await authService.logoutUser(rawRefreshToken);
  clearRefreshTokenCookie(res);
  sendSuccess(res, 200, { message: 'Logged out successfully' });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  // `authenticate` middleware runs before this handler and guarantees req.user is set.
  const user = await authService.getUserById(req.user!.userId);
  sendSuccess(res, 200, { user });
});
