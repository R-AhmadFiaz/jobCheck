import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryRateLimitStore } from '@/lib/rateLimit/store';

test('allows requests up to the max within a window', async () => {
  const store = new InMemoryRateLimitStore();
  const key = 'k1';
  for (let i = 0; i < 3; i++) {
    const result = await store.consume(key, 60_000, 3);
    assert.equal(result.allowed, true);
  }
});

test('blocks the request that exceeds max within the same window', async () => {
  const store = new InMemoryRateLimitStore();
  const key = 'k2';
  await store.consume(key, 60_000, 2);
  await store.consume(key, 60_000, 2);
  const third = await store.consume(key, 60_000, 2);
  assert.equal(third.allowed, false);
  assert.equal(third.remaining, 0);
});

test('different keys are tracked independently', async () => {
  const store = new InMemoryRateLimitStore();
  await store.consume('a', 60_000, 1);
  const resultA = await store.consume('a', 60_000, 1);
  const resultB = await store.consume('b', 60_000, 1);
  assert.equal(resultA.allowed, false);
  assert.equal(resultB.allowed, true);
});

test('the window resets the counter once resetAt has passed', async () => {
  const store = new InMemoryRateLimitStore();
  const key = 'k3';
  const first = await store.consume(key, 10, 1);
  assert.equal(first.allowed, true);
  await new Promise((resolve) => setTimeout(resolve, 20));
  const afterWindow = await store.consume(key, 10, 1);
  assert.equal(afterWindow.allowed, true);
});
