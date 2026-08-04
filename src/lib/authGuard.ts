import type { NextRequest } from 'next/server';
import { verifyAccessToken, type AccessTokenPayload } from '@/shared/utils/jwt';
import { ApiError } from '@/shared/utils/ApiError';
import type { UserRole } from '@/modules/users/user.model';

// Next.js migration: replaces auth.middleware.ts / optionalAuth.middleware.ts
// / role.middleware.ts's Express middleware chain (req.user + next()) with
// plain functions Route Handlers call explicitly and use the return value
// of. Same logic (read Authorization header, verify Bearer JWT, same
// ApiError messages/status codes) — only the invocation mechanism changes.

function getBearerToken(request: NextRequest): string | null {
  const header = request.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length);
}

/** Throws ApiError(401, ...) if there is no valid access token. */
export function authenticate(request: NextRequest): AccessTokenPayload {
  const token = getBearerToken(request);
  if (!token) {
    throw new ApiError(401, 'Authentication required');
  }
  try {
    return verifyAccessToken(token);
  } catch {
    throw new ApiError(401, 'Invalid or expired access token');
  }
}

/** A missing/invalid token is not an error here — returns null for an anonymous requester. */
export function optionalAuthenticate(request: NextRequest): AccessTokenPayload | null {
  const token = getBearerToken(request);
  if (!token) return null;
  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}

/** Throws ApiError(401/403, ...) — call after authenticate() has already run. */
export function requireRole(user: AccessTokenPayload, ...roles: UserRole[]): void {
  if (!roles.includes(user.role)) {
    throw new ApiError(403, 'Insufficient permissions');
  }
}
