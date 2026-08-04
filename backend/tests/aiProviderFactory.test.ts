import { test } from 'node:test';
import assert from 'node:assert/strict';
import { env } from '@/config/env';
import { getAIProvider } from '@/modules/analysis/ai/aiProviderFactory';

const ORIGINAL_AI_ENABLED = env.AI_ENABLED;

function restoreEnv() {
  env.AI_ENABLED = ORIGINAL_AI_ENABLED;
}

// 1. AI disabled — the master switch for the entire AI layer.
test('1. AI_ENABLED=false: getAIProvider returns null', () => {
  env.AI_ENABLED = false;
  assert.equal(getAIProvider(), null);
  restoreEnv();
});

test('AI_ENABLED=true: getAIProvider returns a provider instance', () => {
  env.AI_ENABLED = true;
  const provider = getAIProvider();
  assert.notEqual(provider, null);
  assert.equal(provider?.name, 'groq');
  restoreEnv();
});

test('getAIProvider returns the same cached instance across calls', () => {
  env.AI_ENABLED = true;
  const first = getAIProvider();
  const second = getAIProvider();
  assert.equal(first, second);
  restoreEnv();
});
