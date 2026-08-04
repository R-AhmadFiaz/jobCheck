import mongoose, { type Mongoose } from 'mongoose';
import { env } from '@/config/env';
import { logger } from '@/shared/utils/logger';

// Next.js migration: the original backend/src/db/connection.ts called
// mongoose.connect() unconditionally with no guard against concurrent/
// repeated calls — fine for a single long-lived Express process, but wrong
// here. Next.js's dev server re-executes route modules on most requests
// (hot module reloading), and any future serverless deployment adds cold
// starts on top of that — both would otherwise open a new connection per
// invocation. This caches the connection (or in-flight connection promise)
// on `globalThis` so it survives module reloads within the same process.
// Connection options/behavior are otherwise unchanged from the original.
//
// Atlas SRV reliability (production-connection fix, round 2): `MONGODB_URI`
// must be a *standard* (non-`+srv`) connection string — see .env.example.
// This was proven necessary, not assumed: a `mongodb+srv://` URI requires
// the driver to resolve a DNS SRV (and TXT) record before it can open any
// connection (mongodb/lib/connection_string.js calls
// `dns.promises.resolve(host, 'SRV')`), and that specific lookup was proven
// unreliable in this Next.js/Windows environment — not merely slow or
// misconfigured, but actively corrupted by ordinary concurrency:
//   1. A one-time `dns.setServers(['1.1.1.1','8.8.8.8'])` (see
//      src/instrumentation.ts) fixes Node's own wrong DNS-server
//      auto-detection (confirmed the real root cause of the *original*
//      failure — Node was auto-detecting 127.0.0.1, nothing listens there).
//   2. But even with that override confirmed active (re-checked with
//      `dns.getServers()` immediately before every connect attempt), a
//      *second* concurrent request for the same route (e.g. a real browser
//      tab open at the same time as any other client) reliably breaks the
//      SRV/TXT lookup for both requests — first with ECONNREFUSED, then
//      with EDESTRUCTION on retry, indefinitely, for as long as the
//      concurrent calls overlap. This is a Node/c-ares-level fragility in
//      the shared DNS channel `dns.resolve(host, 'SRV'|'TXT')` uses, not an
//      import-order or timing bug in this codebase.
//   3. `dns.lookup()` — the only DNS mechanism a *standard* connection
//      string needs (plain A-record lookups for the known shard hosts, via
//      the OS resolver/libuv threadpool, never c-ares's SRV/TXT path) — was
//      stress-tested under the exact same kind of concurrency (5 parallel
//      bursts × 3 hosts) and succeeded 15/15, every time.
// Switching the connection string format is therefore the actual fix, not
// a fallback: it removes the unreliable code path entirely instead of
// trying to make it reliable. The three shard hostnames don't change under
// normal Atlas operation (only during a resize/maintenance event, at which
// point Atlas will surface a new connection string) — see .env.example for
// the exact non-SRV URI format to use, built from this cluster's actual
// resolved SRV+TXT records.

interface MongooseCache {
  conn: Mongoose | null;
  promise: Promise<Mongoose> | null;
}

declare global {
  var __jobcheckMongooseCache: MongooseCache | undefined;
}

const cache: MongooseCache = globalThis.__jobcheckMongooseCache ?? { conn: null, promise: null };
globalThis.__jobcheckMongooseCache = cache;

let listenersAttached = false;

function attachConnectionListeners(): void {
  if (listenersAttached) return;
  listenersAttached = true;
  mongoose.connection.on('connected', () => logger.info('MongoDB connected'));
  mongoose.connection.on('error', (err) => logger.error({ err }, 'MongoDB connection error'));
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
}

/**
 * Returns the shared Mongoose connection, creating it on first call and
 * reusing it (or the in-flight connect promise) on every subsequent call —
 * within this process, at most one `mongoose.connect()` is ever issued.
 * Same fail-soft behavior as the original: a failed attempt is logged and
 * rethrown to the caller rather than crashing the process, and the cached
 * promise is cleared so the next call retries instead of permanently
 * caching a rejected connection.
 */
export async function connectDB(): Promise<Mongoose> {
  attachConnectionListeners();

  if (cache.conn) return cache.conn;

  if (!cache.promise) {
    cache.promise = mongoose
      // `dbName` is explicit here (rather than relying on a `/jobcheck` path
      // segment in the URI) because Atlas's own UI-generated connection
      // strings omit the database name by default
      // (`mongodb+srv://user:pass@cluster.mongodb.net/?...`, no path before
      // the `?`) — without this, the driver would silently default to a
      // database named "test" instead of "jobcheck", exactly as it always
      // was locally (`mongodb://localhost:27017/jobcheck`). Passing it here
      // keeps that behavior correct regardless of what is or isn't in the
      // URI path.
      .connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 5000, dbName: 'jobcheck' })
      .catch((err: unknown) => {
        cache.promise = null;
        logger.error({ err }, 'MongoDB connection attempt failed');
        throw err;
      });
  }

  cache.conn = await cache.promise;
  return cache.conn;
}

const READY_STATES: Record<number, 'disconnected' | 'connected' | 'connecting' | 'disconnecting'> =
  {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

export function getDbState(): 'disconnected' | 'connected' | 'connecting' | 'disconnecting' {
  return READY_STATES[mongoose.connection.readyState] ?? 'disconnected';
}
