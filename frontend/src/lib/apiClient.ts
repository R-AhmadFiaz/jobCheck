import { env } from '@/config/env';

export class ApiClientError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  skipAuthRetry?: boolean;
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { message: string };
}

async function rawRequest(path: string, options: RequestOptions = {}): Promise<Response> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  return fetch(`${env.apiBaseUrl}${path}`, {
    ...options,
    headers,
    credentials: 'include',
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
}

let pendingRefresh: Promise<boolean> | null = null;

// Refresh token lives only in an httpOnly cookie (§7) — this just re-requests
// a fresh access token using it. Deduped so concurrent 401s trigger one call.
async function refreshAccessToken(): Promise<boolean> {
  if (!pendingRefresh) {
    pendingRefresh = (async () => {
      try {
        const res = await rawRequest('/auth/refresh', { method: 'POST', skipAuthRetry: true });
        if (!res.ok) return false;
        const body = (await res.json()) as ApiEnvelope<{ accessToken: string }>;
        if (!body.data) return false;
        setAccessToken(body.data.accessToken);
        return true;
      } catch {
        return false;
      } finally {
        pendingRefresh = null;
      }
    })();
  }
  return pendingRefresh;
}

// `fetch` itself rejects (rather than resolving with an error response) when the
// request never reaches — or the response never reaches back past — the browser:
// a CORS block, the backend being down, or a DNS/network failure all land here.
// Without this, that shows up as an opaque generic error with no indication of
// what actually happened, which makes exactly this class of bug hard to diagnose.
async function requestOrThrow(path: string, options: RequestOptions): Promise<Response> {
  try {
    return await rawRequest(path, options);
  } catch {
    throw new ApiClientError(
      0,
      `Could not reach the API at ${env.apiBaseUrl}. This is usually a CORS mismatch (check the backend's CLIENT_ORIGIN against this page's actual origin) or the backend not running.`,
    );
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let res = await requestOrThrow(path, options);

  if (res.status === 401 && !options.skipAuthRetry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      res = await requestOrThrow(path, { ...options, skipAuthRetry: true });
    }
  }

  const body = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (!res.ok || !body?.success) {
    throw new ApiClientError(res.status, body?.error?.message ?? `Request failed (${res.status})`);
  }

  return body.data as T;
}
