import type { NextRequest } from 'next/server';

// Next.js migration: `NextRequest` has no `.ip` property (Express's `req.ip`
// has no direct equivalent) — the documented approach is to read the
// `x-forwarded-for` header, which Vercel's proxy sets correctly in
// production. Falls back to `x-real-ip`, then a fixed placeholder for local
// dev requests that carry neither header (loopback requests typically
// don't), which still buckets all such requests together for rate-limiting
// purposes rather than throwing.
export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() ?? 'unknown';
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;
  return 'unknown';
}
