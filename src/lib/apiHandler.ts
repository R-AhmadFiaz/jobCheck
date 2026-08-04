import { NextResponse, type NextRequest } from 'next/server';
import { env } from '@/config/env';
import { ApiError } from '@/shared/utils/ApiError';
import { logger } from '@/shared/utils/logger';

// Next.js migration: replaces errorHandler.middleware.ts + asyncHandler.ts.
// Express's `next(err)` → centralized error middleware model has no direct
// equivalent for Route Handlers, so this wraps a handler in try/catch and
// produces the exact same `{success:false, error:{message, ...}}` JSON
// shape, the same status-code derivation from ApiError, the same
// operational-vs-unexpected logging split, and the same dev-only stack
// trace on unexpected errors. `ApiError` itself (including its `details`
// field, added in the production-hardening phase) is unchanged — copied
// verbatim from the Express backend.
//
// The one thing intentionally dropped: Express-specific MulterError
// normalization. There is no multer in the Next.js app (see the file-
// upload adapter in app/api/v1/analyze/public/route.ts) — the same
// "Uploaded file is too large."/"Unsupported file type..." messages are
// now thrown directly as ApiError from that adapter, so this wrapper never
// needs to special-case a multer-specific error type.

type RouteHandler<Ctx> = (request: NextRequest, context: Ctx) => Promise<NextResponse>;

interface ApiHandlerOptions {
  // Security-audit hardening: by default every response gets
  // `Cache-Control: private, no-store`, since almost every route in this
  // app is authenticated or otherwise returns data specific to whoever is
  // asking. Set `public: true` only for the few routes that are
  // intentionally public by design (the anonymous analyzer, the
  // report-share-link endpoint) — this opts them out of the header
  // entirely rather than forcing a `public` caching directive onto them,
  // so their caching behavior is unchanged from before this option existed.
  public?: boolean;
}

export function apiHandler<Ctx = { params: Promise<Record<string, string>> }>(
  handler: RouteHandler<Ctx>,
  options: ApiHandlerOptions = {},
): RouteHandler<Ctx> {
  return async (request, context) => {
    try {
      const response = await handler(request, context);
      if (!options.public) {
        response.headers.set('Cache-Control', 'private, no-store');
      }
      return response;
    } catch (rawErr) {
      const err = rawErr instanceof Error ? rawErr : new Error(String(rawErr));
      const isApiError = err instanceof ApiError;
      const statusCode = isApiError ? err.statusCode : 500;
      const message = isApiError && err.isOperational ? err.message : 'Internal server error';

      if (!isApiError || !err.isOperational) {
        logger.error(
          { err, path: request.nextUrl.pathname, method: request.method },
          'Unhandled error',
        );
      } else {
        logger.warn({ path: request.nextUrl.pathname, method: request.method }, err.message);
      }

      return NextResponse.json(
        {
          success: false,
          error: {
            message,
            ...(isApiError && err.isOperational && err.details ? err.details : {}),
            ...(env.isDevelopment && !isApiError ? { stack: err.stack } : {}),
          },
        },
        // No-store regardless of the `public` option — an error response
        // (rate-limited, not-found, validation failure, ...) should never
        // be cached and replayed to a later, different request.
        { status: statusCode, headers: { 'Cache-Control': 'no-store' } },
      );
    }
  };
}
