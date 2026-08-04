import { test } from 'node:test';
import assert from 'node:assert/strict';
import { env } from '@/config/env';
import {
  checkAuthenticatedAnalysisRateLimit,
  checkPublicAnalysisRateLimit,
} from '@/lib/rateLimit/rateLimit';
import { ApiError } from '@/shared/utils/ApiError';

// Each test below uses a unique IP/user id so it doesn't collide with the
// shared, globalThis-cached store used by every other test in this file.

test('checkPublicAnalysisRateLimit allows requests up to the configured max for a given IP', async () => {
  const ip = '203.0.113.1';
  for (let i = 0; i < env.PUBLIC_ANALYSIS_RATE_LIMIT_MAX; i++) {
    await checkPublicAnalysisRateLimit(ip);
  }
});

test('checkPublicAnalysisRateLimit throws a 429 ApiError once the max is exceeded for that IP', async () => {
  const ip = '203.0.113.2';
  for (let i = 0; i < env.PUBLIC_ANALYSIS_RATE_LIMIT_MAX; i++) {
    await checkPublicAnalysisRateLimit(ip);
  }
  await assert.rejects(
    () => checkPublicAnalysisRateLimit(ip),
    (err: unknown) => {
      assert.ok(err instanceof ApiError);
      assert.equal(err.statusCode, 429);
      return true;
    },
  );
});

test('checkPublicAnalysisRateLimit tracks separate IPs independently', async () => {
  const ipA = '203.0.113.3';
  const ipB = '203.0.113.4';
  for (let i = 0; i < env.PUBLIC_ANALYSIS_RATE_LIMIT_MAX; i++) {
    await checkPublicAnalysisRateLimit(ipA);
  }
  // ipB has never been consumed, so it must still be allowed even though
  // ipA is now over its limit.
  await checkPublicAnalysisRateLimit(ipB);
});

test('checkAuthenticatedAnalysisRateLimit allows requests up to the configured max for a given user', async () => {
  const userId = 'user-rate-limit-test-1';
  for (let i = 0; i < env.AUTHENTICATED_ANALYSIS_RATE_LIMIT_MAX; i++) {
    await checkAuthenticatedAnalysisRateLimit(userId);
  }
});

test('checkAuthenticatedAnalysisRateLimit throws a 429 ApiError once the max is exceeded for that user', async () => {
  const userId = 'user-rate-limit-test-2';
  for (let i = 0; i < env.AUTHENTICATED_ANALYSIS_RATE_LIMIT_MAX; i++) {
    await checkAuthenticatedAnalysisRateLimit(userId);
  }
  await assert.rejects(
    () => checkAuthenticatedAnalysisRateLimit(userId),
    (err: unknown) => {
      assert.ok(err instanceof ApiError);
      assert.equal(err.statusCode, 429);
      return true;
    },
  );
});

test('guest (IP-keyed) and authenticated (user-id-keyed) limits are tracked independently', async () => {
  const sharedIdentifier = '203.0.113.5';
  for (let i = 0; i < env.PUBLIC_ANALYSIS_RATE_LIMIT_MAX; i++) {
    await checkPublicAnalysisRateLimit(sharedIdentifier);
  }
  // Same string used as a user id must not be affected by the guest bucket
  // above being exhausted — they're namespaced by different key prefixes.
  await checkAuthenticatedAnalysisRateLimit(sharedIdentifier);
});
