import type { NextResponse } from 'next/server';
import { env } from '@/config/env';

// Next.js migration: replaces auth.controller.ts's res.cookie()/clearCookie()
// helpers. Same cookie name, same httpOnly/secure/sameSite/path options —
// only `maxAge` changes UNITS (Express's res.cookie expects milliseconds;
// Next.js's cookie APIs expect seconds), not value/duration.
export const REFRESH_TOKEN_COOKIE = 'refreshToken';
export const REFRESH_TOKEN_COOKIE_PATH = '/api/v1/auth';

export function setRefreshTokenCookie(response: NextResponse, token: string): void {
  response.cookies.set(REFRESH_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'strict',
    path: REFRESH_TOKEN_COOKIE_PATH,
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60, // seconds
  });
}

export function clearRefreshTokenCookie(response: NextResponse): void {
  response.cookies.set(REFRESH_TOKEN_COOKIE, '', {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'strict',
    path: REFRESH_TOKEN_COOKIE_PATH,
    maxAge: 0,
  });
}
