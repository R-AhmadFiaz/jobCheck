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
      .connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
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
