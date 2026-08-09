import * as Sentry from '@sentry/nextjs';

// Read directly from process.env, not @/config/env — kept intentionally
// self-contained (see instrumentation-client.ts's note) rather than adding
// a dependency between Sentry's own bootstrap and the app's env validation.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
