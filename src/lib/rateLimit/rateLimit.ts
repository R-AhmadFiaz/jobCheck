import { env } from '@/config/env';
import { ApiError } from '@/shared/utils/ApiError';
import { InMemoryRateLimitStore, type RateLimitStore } from '@/lib/rateLimit/store';

// Next.js migration: replaces rateLimiter.middleware.ts's express-rate-limit
// instances. Same windows/max values (from the same env vars — limits are
// NOT weakened), same two limiter identities (guest-by-IP,
// authenticated-by-user-id), same 429 messages. The only thing that changed
// is the mechanism: a plain function each Route Handler calls explicitly,
// backed by the swappable RateLimitStore above, instead of Express
// middleware with its own built-in (also in-memory) store.
//
// Cached on globalThis for the same reason db.ts's connection is — so
// Next.js dev-mode module reloads don't reset every client's counters on
// every request.
declare global {
  var __jobcheckRateLimitStore: RateLimitStore | undefined;
}

const store: RateLimitStore = globalThis.__jobcheckRateLimitStore ?? new InMemoryRateLimitStore();
globalThis.__jobcheckRateLimitStore = store;

/** Guests are identified only by IP — no tokens issued to guests. */
export async function checkPublicAnalysisRateLimit(ip: string): Promise<void> {
  const result = await store.consume(
    `public-analysis:${ip}`,
    env.PUBLIC_ANALYSIS_RATE_LIMIT_WINDOW_MS,
    env.PUBLIC_ANALYSIS_RATE_LIMIT_MAX,
  );
  if (!result.allowed) {
    throw new ApiError(429, 'Too many analysis requests from this IP. Please try again later.');
  }
}

/** Keyed by user id (already identified) — more generous than the guest limit on purpose. */
export async function checkAuthenticatedAnalysisRateLimit(userId: string): Promise<void> {
  const result = await store.consume(
    `authenticated-analysis:${userId}`,
    env.AUTHENTICATED_ANALYSIS_RATE_LIMIT_WINDOW_MS,
    env.AUTHENTICATED_ANALYSIS_RATE_LIMIT_MAX,
  );
  if (!result.allowed) {
    throw new ApiError(
      429,
      'Too many analysis requests from this account. Please try again later.',
    );
  }
}

// Security-audit hardening: neither /auth/login nor /auth/register had any
// rate limiting before (not a migration regression — the original Express
// app didn't have it either). IP-keyed, same store/abstraction as above, so
// swapping to a distributed store later covers these too with no changes
// here.
export async function checkLoginRateLimit(ip: string): Promise<void> {
  const result = await store.consume(
    `login:${ip}`,
    env.LOGIN_RATE_LIMIT_WINDOW_MS,
    env.LOGIN_RATE_LIMIT_MAX,
  );
  if (!result.allowed) {
    throw new ApiError(429, 'Too many login attempts from this IP. Please try again later.');
  }
}

export async function checkRegisterRateLimit(ip: string): Promise<void> {
  const result = await store.consume(
    `register:${ip}`,
    env.REGISTER_RATE_LIMIT_WINDOW_MS,
    env.REGISTER_RATE_LIMIT_MAX,
  );
  if (!result.allowed) {
    throw new ApiError(
      429,
      'Too many registration attempts from this IP. Please try again later.',
    );
  }
}

export async function checkContactRateLimit(ip: string): Promise<void> {
  const result = await store.consume(
    `contact:${ip}`,
    env.CONTACT_RATE_LIMIT_WINDOW_MS,
    env.CONTACT_RATE_LIMIT_MAX,
  );
  if (!result.allowed) {
    throw new ApiError(429, 'Too many messages sent from this IP. Please try again later.');
  }
}

export async function checkChatRateLimit(ip: string): Promise<void> {
  const result = await store.consume(`chat:${ip}`, env.CHAT_RATE_LIMIT_WINDOW_MS, env.CHAT_RATE_LIMIT_MAX);
  if (!result.allowed) {
    throw new ApiError(429, 'Too many messages sent. Please wait a moment before trying again.');
  }
}
