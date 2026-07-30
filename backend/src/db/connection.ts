import mongoose from 'mongoose';
import { env } from '@/config/env';
import { logger } from '@/shared/utils/logger';

mongoose.connection.on('connected', () => {
  logger.info('MongoDB connected');
});

mongoose.connection.on('error', (err) => {
  logger.error({ err }, 'MongoDB connection error');
});

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

/**
 * Attempts to connect to MongoDB without blocking server startup on failure.
 * No routes depend on the database yet (Phase 0) — the health check endpoint
 * surfaces connection state via mongoose.connection.readyState instead.
 */
export async function connectDB(): Promise<void> {
  try {
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
  } catch (err) {
    logger.error({ err }, 'Initial MongoDB connection attempt failed');
  }
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
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
