'use client';

import { Component, useEffect, useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { Alert, Spinner } from '@/components/ui';
import { getAccessToken, refreshAccessToken } from '@/lib/apiClient';
import 'swagger-ui-react/swagger-ui.css';

// swagger-ui-react touches `window`/`document` at module scope, so it must
// never be part of the server render — same ssr:false pattern this project
// already uses for other browser-only widgets (see useDarkMode).
const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

// swagger-ui-react is a large third-party widget with its own internal
// mount/render lifecycle, outside this app's control. Nothing else in the
// app renders a boundary like this because no other admin page embeds a
// component this size — a failure inside it would otherwise crash the
// whole page with no indication of what happened.
class SwaggerErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <Alert variant="error" title="The API documentation widget failed to render">
          {this.state.error.message}
        </Alert>
      );
    }
    return this.props.children;
  }
}

async function fetchSpec(): Promise<object> {
  const token = getAccessToken();
  if (!token) {
    throw new Error('No access token available. Try refreshing the page.');
  }

  let res = await fetch('/api/v1/openapi.json', {
    headers: { Authorization: `Bearer ${token}` },
    credentials: 'same-origin',
  });

  // /api/v1/openapi.json returns the raw OpenAPI document, not this app's
  // {success,data} envelope, so it can't go through apiRequest() — but it
  // still needs the same "an expired access token is refreshed and the
  // request retried, transparently" behavior every other admin page gets
  // from apiRequest(). Without this, a token that expired while the user
  // was on a previous page would surface as a bare failure here instead of
  // silently recovering like it would anywhere else in the app.
  if (res.status === 401) {
    const refreshed = await refreshAccessToken();
    if (!refreshed) {
      throw new Error('Your session has expired. Please sign in again.');
    }
    const newToken = getAccessToken();
    res = await fetch('/api/v1/openapi.json', {
      headers: { Authorization: `Bearer ${newToken}` },
      credentials: 'same-origin',
    });
  }

  if (!res.ok) {
    throw new Error(`Failed to load API spec (${res.status})`);
  }

  return res.json();
}

// The spec endpoint is admin-gated (same authenticate + requireRole('admin')
// pattern as every other admin route), so Swagger UI's own `url` fetch —
// which wouldn't attach our Bearer token — can't be used to load it. Fetching
// it manually here and handing the parsed object to `spec` instead. Calls
// made via the in-page "Authorize" button (backed by the bearerAuth scheme
// in the spec) still go straight from Swagger UI to the API, unmodified.
export function ApiDocsPage() {
  const [spec, setSpec] = useState<object | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchSpec()
      .then((json) => {
        if (!cancelled) setSpec(json);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load API spec.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="animate-fade-up">
        <h1
          className="text-2xl font-extrabold text-[var(--foreground)]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Admin — API Docs
        </h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          Interactive OpenAPI documentation for every JobCheck API route. Use &quot;Authorize&quot;
          below to try requests with your current session.
        </p>
      </div>

      {error && <Alert variant="error" title="Could not load API documentation">{error}</Alert>}

      {!spec && !error && (
        <div className="flex items-center justify-center py-24">
          <Spinner size={28} />
        </div>
      )}

      {spec && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
          <SwaggerErrorBoundary>
            <SwaggerUI spec={spec} />
          </SwaggerErrorBoundary>
        </div>
      )}
    </div>
  );
}
