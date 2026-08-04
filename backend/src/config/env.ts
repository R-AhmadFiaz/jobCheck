import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  CLIENT_ORIGIN: z.string().min(1, 'CLIENT_ORIGIN is required'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  PUBLIC_ANALYSIS_MAX_FILE_SIZE_MB: z.coerce.number().positive().default(5),
  PUBLIC_ANALYSIS_RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(15 * 60 * 1000),
  PUBLIC_ANALYSIS_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  // Production-hardening phase: POST /analyses (authenticated) previously had
  // no rate limit at all, unlike the guest endpoint above — a logged-in
  // client could otherwise trigger unlimited Groq calls with zero backend
  // throttling. Keyed by user id rather than IP (see rateLimiter.middleware.ts),
  // so the limit is more generous than the guest one — authenticated users
  // are identified and less likely to be abuse — but still bounded.
  AUTHENTICATED_ANALYSIS_RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(15 * 60 * 1000),
  AUTHENTICATED_ANALYSIS_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(30),
  URL_EXTRACTION_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),
  URL_EXTRACTION_MAX_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(2 * 1024 * 1024),
  // Optional — the app must work fully without it (rule engine only).
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-2.0-flash'),
  GEMINI_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),
  // Optional — architecture seam only (modules/analysis/ai/), not yet called
  // from anywhere. The app must work fully without it.
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().default('llama-3.3-70b-versatile'),
  GROQ_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),
  // Master switch for the AI provider layer (Phase 7). Defaults to false so
  // every existing environment behaves exactly as before this phase, even
  // if GROQ_API_KEY happens to already be set. Deliberately NOT
  // z.coerce.boolean() — that coerces the string "false" to `true` (any
  // non-empty string is truthy), which would silently defeat this flag.
  AI_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  ...parsed.data,
  isProduction: parsed.data.NODE_ENV === 'production',
  isDevelopment: parsed.data.NODE_ENV === 'development',
  isTest: parsed.data.NODE_ENV === 'test',
  clientOrigins: parsed.data.CLIENT_ORIGIN.split(',').map((origin) => origin.trim()),
};
