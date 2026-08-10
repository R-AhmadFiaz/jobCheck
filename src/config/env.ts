import { config } from 'dotenv';
import { z } from 'zod';

// Next.js's CLI (dev/build/start) auto-loads .env.local into process.env
// before this module ever runs, so this call is a no-op there (dotenv never
// overrides a variable that's already set). It's required for every other
// runtime that imports this module directly — tests, seed scripts — since
// those run via plain `tsx`, which has no knowledge of Next.js's env
// loading.
config({ path: '.env.local' });

// Next.js migration: identical variable names/semantics to the Express
// backend's env.ts, so the existing .env values keep working unchanged. The
// one removal is CLIENT_ORIGIN/its derived `clientOrigins` — that existed
// only to build an Express `cors()` allow-list for a separate-origin
// frontend; frontend and API now share one origin (this app), so CORS is
// no longer needed for normal operation.
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
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
  AUTHENTICATED_ANALYSIS_RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(15 * 60 * 1000),
  AUTHENTICATED_ANALYSIS_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(30),
  // Security-audit hardening: the original Express app had no rate limiting
  // on /auth/login or /auth/register either — this isn't replacing a
  // removed protection, it's adding one that never existed, using the same
  // IP-keyed RateLimitStore abstraction the analysis endpoints already use.
  LOGIN_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  REGISTER_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60 * 60 * 1000),
  REGISTER_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),
  URL_EXTRACTION_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),
  URL_EXTRACTION_MAX_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(2 * 1024 * 1024),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-2.0-flash'),
  GEMINI_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().default('llama-3.3-70b-versatile'),
  GROQ_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),
  AI_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  // Resend (contact form notification email) — optional, same "off unless
  // configured" pattern as GROQ_API_KEY/GEMINI_API_KEY above. CONTACT_EMAIL_TO
  // is the admin inbox that receives submissions; CONTACT_EMAIL_FROM defaults
  // to Resend's own documented sandbox sender, usable with no verified domain.
  RESEND_API_KEY: z.string().optional(),
  CONTACT_EMAIL_TO: z.string().email().optional(),
  CONTACT_EMAIL_FROM: z.string().default('JobCheck <onboarding@resend.dev>'),
  CONTACT_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  CONTACT_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment configuration — see logged fieldErrors above.');
}

export const env = {
  ...parsed.data,
  isProduction: parsed.data.NODE_ENV === 'production',
  isDevelopment: parsed.data.NODE_ENV === 'development',
  isTest: parsed.data.NODE_ENV === 'test',
};
