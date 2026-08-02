import rateLimit from 'express-rate-limit';
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
