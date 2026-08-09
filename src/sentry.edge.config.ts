import * as Sentry from '@sentry/nextjs';

// Same config as sentry.server.config.ts, kept as a separate file because
// the Edge runtime is a distinct bundle from Node.js — instrumentation.ts
// loads whichever one actually matches the running runtime.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
