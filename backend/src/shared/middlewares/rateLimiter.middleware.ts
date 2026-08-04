import rateLimit from 'express-rate-limit';
import type { Request } from 'express';
import { env } from '@/config/env';

// Guests are identified only by IP (§7 of docs/ARCHITECTURE.md — no tokens issued
// to guests), so IP is the only available rate-limit bucket key here.
export const publicAnalysisRateLimiter = rateLimit({
  windowMs: env.PUBLIC_ANALYSIS_RATE_LIMIT_WINDOW_MS,
  max: env.PUBLIC_ANALYSIS_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { message: 'Too many analysis requests from this IP. Please try again later.' },
  },
});

// Production-hardening phase: POST /analyses previously had no rate limit at
// all. Every analysis (guest or authenticated) triggers at most one Groq
// call each, so this is what actually bounds how many AI requests a single
// account can generate — must run AFTER `authenticate` (needs req.user).
// Keyed by user id, not IP, since these requests are already identified —
// more generous than the guest limit on purpose.
export const authenticatedAnalysisRateLimiter = rateLimit({
  windowMs: env.AUTHENTICATED_ANALYSIS_RATE_LIMIT_WINDOW_MS,
  max: env.AUTHENTICATED_ANALYSIS_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.user?.userId ?? req.ip ?? 'unknown',
  message: {
    success: false,
    error: { message: 'Too many analysis requests from this account. Please try again later.' },
  },
});
