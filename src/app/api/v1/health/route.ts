import { NextResponse } from 'next/server';
import { getDbState } from '@/lib/db';
import { env } from '@/config/env';
import { successBody } from '@/shared/utils/ApiResponse';
import { apiHandler } from '@/lib/apiHandler';

export const GET = apiHandler(
  async () => {
    return NextResponse.json(
      successBody({
        status: 'ok',
        environment: env.NODE_ENV,
        // Meaningless per-invocation on serverless — kept for parity with the
        // original endpoint shape rather than silently removed; documented in
        // the migration report, not fixed (out of scope for this phase).
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        db: getDbState(),
      }),
      { status: 200 },
    );
  },
  // Explicitly left unchanged by the security audit — kept public so this
  // route's response is byte-for-byte identical to before.
  { public: true },
);
