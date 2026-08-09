'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

// Root-level fallback for uncaught client-side rendering errors — a
// different, earlier surface than instrumentation.ts's onRequestError
// (server-side only) and apiHandler.ts's try/catch (API routes only).
// Without this file, a crash in the root layout showed Next's default
// error UI and was never reported anywhere.
//
// Deliberately not using next/error's default export (a common pattern in
// generic Sentry examples): in this Next.js version its own type
// declarations say "Default export is Pages Router only" — it's the legacy
// pages/_error component, not written for the App Router. This renders its
// own minimal markup instead. `retry` (not `reset`) is the current, stable
// prop name as of Next.js 16.3.0 — this project's exact version.
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    // global-error replaces the root layout when active, so it must define
    // its own <html>/<body> — it does not inherit globals.css or fonts.
    <html>
      <body style={{ fontFamily: 'system-ui, sans-serif', textAlign: 'center', padding: '4rem 1rem' }}>
        <h2>Something went wrong.</h2>
        <p>Please try again, or refresh the page.</p>
        <button
          onClick={() => retry()}
          style={{
            marginTop: '1rem',
            padding: '0.5rem 1.25rem',
            borderRadius: '0.5rem',
            border: '1px solid #ccc',
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
