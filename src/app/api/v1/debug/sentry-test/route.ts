import { apiHandler } from '@/lib/apiHandler';
import { env } from '@/config/env';
import { ApiError } from '@/shared/utils/ApiError';

// Deliberately outside the documented API surface (excluded from
// src/lib/openapi/spec.ts) and not a real endpoint — the only purpose of
// this route is to prove Sentry actually receives an error, once, on
// request. Hard-gated on env.isDevelopment: NODE_ENV is "production" for
// every Vercel deployment (including previews), so this always 404s
// outside a genuine local `next dev` session — there is no env this route
// is reachable from once deployed. (Not named with a leading underscore —
// "_debug" — since Next.js treats any `_folder` as a private folder
// excluded from routing entirely; that would have silently made this route
// unreachable rather than merely gated.)
//
// Reuses apiHandler on purpose rather than calling Sentry.captureException
// directly: throwing a real, unexpected error through the exact same
// try/catch every production route already goes through (src/lib/
// apiHandler.ts) verifies the actual integration point, not a special case.
export const POST = apiHandler(async () => {
  if (!env.isDevelopment) {
    throw new ApiError(404, 'Not found');
  }

  throw new Error(
    'Sentry test error — intentionally triggered via POST /api/v1/debug/sentry-test (development only).',
  );
});
