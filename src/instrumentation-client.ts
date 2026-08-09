import * as Sentry from '@sentry/nextjs';

// Next.js's client-env inlining only recognizes the literal
// `process.env.NEXT_PUBLIC_*` expression at build time — it can't be read
// indirectly through @/config/env (a server-only module: importing it here
// would pull dotenv/mongoose-adjacent code into the browser bundle). If the
// var is unset, dsn is undefined and the SDK disables itself, matching how
// this app already treats other optional integrations (GROQ_API_KEY, etc.)
// — no DSN means Sentry is simply off, not a startup error.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
});

// Required by the SDK to instrument App Router client-side navigations
// (it warns at build time otherwise) — this project's own
// onRouterTransitionStart hook (none currently defined) is unaffected;
// Sentry's is a separate, independently-registered listener.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
