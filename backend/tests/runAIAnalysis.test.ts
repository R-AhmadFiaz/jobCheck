import { test } from 'node:test';
import assert from 'node:assert/strict';
import { env } from '@/config/env';
import { runAIAnalysis } from '@/modules/analysis/analysis.service';

// Production-hardening phase: this is the exact boundary analysis.service.ts
// calls before the deterministic rule engine ever runs. Every scenario here
// asserts the same two guarantees no matter what fails: (1) runAIAnalysis
// never rejects/throws — it always resolves, usually to null — and (2) the
// real provider chain (getAIProvider → GroqProvider → fetch) is invoked at
// most once per call, so a single analysis request can never generate a
// request storm even when the provider fails repeatedly across calls.

const ORIGINAL_AI_ENABLED = env.AI_ENABLED;
const ORIGINAL_GROQ_API_KEY = env.GROQ_API_KEY;
const ORIGINAL_GROQ_TIMEOUT_MS = env.GROQ_TIMEOUT_MS;

function restoreEnv() {
  env.AI_ENABLED = ORIGINAL_AI_ENABLED;
  env.GROQ_API_KEY = ORIGINAL_GROQ_API_KEY;
  env.GROQ_TIMEOUT_MS = ORIGINAL_GROQ_TIMEOUT_MS;
}

function chatCompletionWith(content: string): Response {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

// B. AI_ENABLED=false
test('B. AI_ENABLED=false: resolves to null, zero fetch calls', async (t) => {
  env.AI_ENABLED = false;
  env.GROQ_API_KEY = 'irrelevant-but-set';
  const fetchMock = t.mock.fn(async () => {
    throw new Error('fetch must not be called when AI_ENABLED is false');
  });
  t.mock.method(globalThis, 'fetch', fetchMock);

  const result = await runAIAnalysis('Need a Python developer remote. Send CV.');
  assert.equal(result, null);
  assert.equal(fetchMock.mock.callCount(), 0);
  restoreEnv();
});

// A. Missing API key (AI_ENABLED=true, but no key)
test('A. AI enabled but no API key: resolves to null, no throw', async (t) => {
  env.AI_ENABLED = true;
  env.GROQ_API_KEY = undefined;
  const fetchMock = t.mock.fn(async () => {
    throw new Error('fetch must not be called without an API key');
  });
  t.mock.method(globalThis, 'fetch', fetchMock);

  const result = await runAIAnalysis('Need a Python developer remote. Send CV.');
  assert.equal(result, null);
  assert.equal(fetchMock.mock.callCount(), 0);
  restoreEnv();
});

// 14/15/16. Every provider failure mode must resolve to null (never throw),
// contained at this boundary, with exactly one provider call attempted.
const FAILURE_SCENARIOS: [string, () => Promise<Response>][] = [
  ['network failure', async () => { throw new Error('network down'); }],
  ['HTTP 429', async () => new Response('{}', { status: 429 })],
  ['HTTP 500', async () => new Response('{}', { status: 500 })],
  ['malformed JSON content', async () => chatCompletionWith('not json {')],
  [
    'invalid schema',
    async () => chatCompletionWith(JSON.stringify({ documentType: 'JOB_POSTING' })),
  ],
  [
    'a non-AIProviderError thrown by the transport',
    async () => {
      throw new TypeError('unexpected transport failure');
    },
  ],
];

for (const [label, fetchImpl] of FAILURE_SCENARIOS) {
  test(`14/15/16. ${label}: contained, resolves to null, exactly one call, no throw`, async (t) => {
    env.AI_ENABLED = true;
    env.GROQ_API_KEY = 'test-key';
    const fetchMock = t.mock.fn(fetchImpl);
    t.mock.method(globalThis, 'fetch', fetchMock);

    // The core assertion: this must never reject, for any failure mode.
    const result = await runAIAnalysis('Need a Python developer remote. Send CV.');
    assert.equal(result, null);
    assert.equal(fetchMock.mock.callCount(), 1, `expected exactly one provider call for: ${label}`);
    restoreEnv();
  });
}

// 11. AI returns a well-formed but empty/negative result — not a failure at
// all, just "nothing to report" — still resolves cleanly, no special-casing needed.
test('11. AI returns a valid, empty/clean result: resolved normally, not treated as a failure', async (t) => {
  env.AI_ENABLED = true;
  env.GROQ_API_KEY = 'test-key';
  t.mock.method(globalThis, 'fetch', async () =>
    chatCompletionWith(
      JSON.stringify({
        documentType: 'JOB_POSTING',
        documentTypeConfidence: 0.9,
        summary: 'Clean posting, nothing notable.',
        redFlags: [],
        recommendations: [],
      }),
    ),
  );

  const result = await runAIAnalysis('Need a Python developer remote. Send CV.');
  assert.notEqual(result, null);
  assert.equal(result?.redFlags.length, 0);
  restoreEnv();
});

// Sanity: a successful call also only fires the provider once.
test('sanity: a successful AI call also only invokes the provider once', async (t) => {
  env.AI_ENABLED = true;
  env.GROQ_API_KEY = 'test-key';
  const fetchMock = t.mock.fn(async () =>
    chatCompletionWith(
      JSON.stringify({
        documentType: 'JOB_POSTING',
        documentTypeConfidence: 0.9,
        summary: 'ok',
        redFlags: [],
        recommendations: [],
      }),
    ),
  );
  t.mock.method(globalThis, 'fetch', fetchMock);

  const result = await runAIAnalysis('Need a Python developer remote. Send CV.');
  assert.notEqual(result, null);
  assert.equal(fetchMock.mock.callCount(), 1);
  restoreEnv();
});
