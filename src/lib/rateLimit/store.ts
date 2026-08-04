// Rate-limit storage abstraction (Next.js migration, per explicit
// instruction: isolate the storage mechanism so the production
// implementation can later be swapped for a shared/distributed store
// without touching any route or business logic — only rateLimit.ts's
// `store` selection below would change).

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // epoch ms
}

export interface RateLimitStore {
  /** Increments the counter for `key` within its current fixed window. */
  consume(key: string, windowMs: number, max: number): Promise<RateLimitResult>;
}

/**
 * ⚠️ NOT production-safe on Vercel serverless. This is an in-process
 * `Map`, so state is per-instance and does not survive across concurrent
 * serverless invocations or multiple instances — a client could bypass the
 * limit simply by landing on a different instance. It is correct and
 * sufficient for local development and for `next dev`/`next start` testing
 * during this migration (single Node process), which is the only thing
 * this phase requires (per the explicit instruction NOT to move to
 * production/Atlas/Vercel yet).
 *
 * Before any real deployment, replace this with a shared-store
 * implementation of the same `RateLimitStore` interface (e.g. Upstash
 * Redis or Vercel KV) and swap it in at the bottom of rateLimit.ts. No
 * route handler or business logic needs to change to do that.
 */
export class InMemoryRateLimitStore implements RateLimitStore {
  private readonly buckets = new Map<string, { count: number; resetAt: number }>();

  async consume(key: string, windowMs: number, max: number): Promise<RateLimitResult> {
    const now = Date.now();
    let bucket = this.buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      this.buckets.set(key, bucket);
    }

    bucket.count += 1;

    return {
      allowed: bucket.count <= max,
      remaining: Math.max(0, max - bucket.count),
      resetAt: bucket.resetAt,
    };
  }
}
