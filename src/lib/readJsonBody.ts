import type { NextRequest } from 'next/server';
import { ApiError } from '@/shared/utils/ApiError';

// Matches the original Express app's `express.json({ limit: '10kb' })` —
// Next.js Route Handlers have no built-in equivalent, so every JSON-body
// route needs this explicitly instead of relying on framework defaults.
const DEFAULT_MAX_BYTES = 10 * 1024;

/**
 * Drop-in replacement for `request.json()` that additionally rejects an
 * oversized body before parsing it. Content-Length is checked first (cheap,
 * rejects before any body bytes are read); the actual received size is then
 * checked too as defense in depth, since Content-Length can be absent
 * (chunked transfer-encoding) or simply not match what's actually sent.
 * Anything else — parsing behavior, the shape of a malformed-JSON error —
 * is unchanged from what `request.json()` already did.
 */
export async function readJsonBody<T = unknown>(
  request: NextRequest,
  maxBytes: number = DEFAULT_MAX_BYTES,
): Promise<T> {
  const declaredSize = Number(request.headers.get('content-length'));
  if (Number.isFinite(declaredSize) && declaredSize > maxBytes) {
    throw new ApiError(413, 'Request body too large.');
  }

  const rawText = await request.text();
  if (Buffer.byteLength(rawText, 'utf8') > maxBytes) {
    throw new ApiError(413, 'Request body too large.');
  }

  return JSON.parse(rawText) as T;
}
