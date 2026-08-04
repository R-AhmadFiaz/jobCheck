import { test } from 'node:test';
import assert from 'node:assert/strict';
import { env } from '@/config/env';
import { GroqProvider } from '@/modules/analysis/ai/providers/groq.provider';
import { AIProviderError } from '@/modules/analysis/ai/interfaces/IAIProvider';

// Production-hardening phase: every failure mode Groq can produce, tested
// against the real GroqProvider class with a mocked global.fetch — never
// the real network (per this phase's explicit testing requirement).

const ORIGINAL_GROQ_API_KEY = env.GROQ_API_KEY;
const ORIGINAL_GROQ_TIMEOUT_MS = env.GROQ_TIMEOUT_MS;

function setApiKey(value: string | undefined) {
  env.GROQ_API_KEY = value;
}

function restoreEnv() {
  env.GROQ_API_KEY = ORIGINAL_GROQ_API_KEY;
  env.GROQ_TIMEOUT_MS = ORIGINAL_GROQ_TIMEOUT_MS;
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function chatCompletionWith(content: string): Response {
  return jsonResponse(200, { choices: [{ message: { content } }] });
}

const VALID_CONTENT = JSON.stringify({
  documentType: 'JOB_POSTING',
  documentTypeConfidence: 0.9,
  summary: 'A normal job posting.',
  redFlags: [],
  recommendations: [],
});

// A. Missing Groq API key
test('A. missing API key: throws MISSING_API_KEY, no fetch attempted', async (t) => {
  setApiKey(undefined);
  const fetchMock = t.mock.fn(async () => {
    throw new Error('fetch should never be called');
  });
  t.mock.method(globalThis, 'fetch', fetchMock);

  const provider = new GroqProvider();
  assert.equal(provider.isConfigured(), false);

  await assert.rejects(
    () => provider.analyzeJobContent({ rawText: 'test' }),
    (err: unknown) => err instanceof AIProviderError && err.code === 'MISSING_API_KEY',
  );
  assert.equal(fetchMock.mock.callCount(), 0);
  restoreEnv();
});

// C/D. Invalid API key → Groq returns 401/403
for (const status of [401, 403]) {
  test(`C/D. Groq returns HTTP ${status}: caught safely as REQUEST_FAILED`, async (t) => {
    setApiKey('test-key');
    t.mock.method(globalThis, 'fetch', async () =>
      jsonResponse(status, { error: { message: 'invalid api key' } }),
    );

    const provider = new GroqProvider();
    await assert.rejects(
      () => provider.analyzeJobContent({ rawText: 'test' }),
      (err: unknown) => err instanceof AIProviderError && err.code === 'REQUEST_FAILED',
    );
    restoreEnv();
  });
}

// E. Groq returns HTTP 429 — no retry, exactly one call
test('E. Groq returns HTTP 429: no retry, exactly one fetch call', async (t) => {
  setApiKey('test-key');
  const fetchMock = t.mock.fn(async () => jsonResponse(429, { error: { message: 'rate limited' } }));
  t.mock.method(globalThis, 'fetch', fetchMock);

  const provider = new GroqProvider();
  await assert.rejects(
    () => provider.analyzeJobContent({ rawText: 'test' }),
    (err: unknown) => err instanceof AIProviderError && err.code === 'REQUEST_FAILED',
  );
  assert.equal(fetchMock.mock.callCount(), 1, 'expected exactly one fetch call, no automatic retry');
  restoreEnv();
});

// F. Groq returns HTTP 500/502/503 — safe degradation, no infinite retry
for (const status of [500, 502, 503]) {
  test(`F. Groq returns HTTP ${status}: safe degradation, exactly one call`, async (t) => {
    setApiKey('test-key');
    const fetchMock = t.mock.fn(async () => jsonResponse(status, { error: 'server error' }));
    t.mock.method(globalThis, 'fetch', fetchMock);

    const provider = new GroqProvider();
    await assert.rejects(
      () => provider.analyzeJobContent({ rawText: 'test' }),
      (err: unknown) => err instanceof AIProviderError && err.code === 'REQUEST_FAILED',
    );
    assert.equal(fetchMock.mock.callCount(), 1);
    restoreEnv();
  });
}

// G. Network failure
test('G. network failure: fetch rejecting is caught as REQUEST_FAILED', async (t) => {
  setApiKey('test-key');
  t.mock.method(globalThis, 'fetch', async () => {
    throw new Error('getaddrinfo ENOTFOUND api.groq.com');
  });

  const provider = new GroqProvider();
  await assert.rejects(
    () => provider.analyzeJobContent({ rawText: 'test' }),
    (err: unknown) => err instanceof AIProviderError && err.code === 'REQUEST_FAILED',
  );
  restoreEnv();
});

// H. Timeout — a hanging request must be aborted, not left hanging forever
test('H. timeout: a hanging request is aborted cleanly within the configured timeout', async (t) => {
  setApiKey('test-key');
  env.GROQ_TIMEOUT_MS = 50;
  t.mock.method(globalThis, 'fetch', (_url: string, init?: { signal?: AbortSignal }) => {
    return new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => {
        const err = new Error('The operation was aborted.');
        err.name = 'AbortError';
        reject(err);
      });
      // Otherwise never resolves — simulates a hung request.
    });
  });

  const provider = new GroqProvider();
  const startedAt = Date.now();
  await assert.rejects(
    () => provider.analyzeJobContent({ rawText: 'test' }),
    (err: unknown) => err instanceof AIProviderError && err.code === 'TIMEOUT',
  );
  const elapsed = Date.now() - startedAt;
  assert.ok(elapsed < 2000, `expected the timeout to fire quickly, took ${elapsed}ms`);
  restoreEnv();
});

// I. Malformed JSON — the model's own text content isn't valid JSON
test('I. malformed JSON from the model: caught as INVALID_RESPONSE, no crash', async (t) => {
  setApiKey('test-key');
  t.mock.method(globalThis, 'fetch', async () =>
    chatCompletionWith('Sure! Here is my answer: {not valid json'),
  );

  const provider = new GroqProvider();
  await assert.rejects(
    () => provider.analyzeJobContent({ rawText: 'test' }),
    (err: unknown) => err instanceof AIProviderError && err.code === 'INVALID_RESPONSE',
  );
  restoreEnv();
});

test('I(b). malformed JSON in the HTTP envelope itself: caught as INVALID_RESPONSE', async (t) => {
  setApiKey('test-key');
  t.mock.method(globalThis, 'fetch', async () => new Response('not json at all', { status: 200 }));

  const provider = new GroqProvider();
  await assert.rejects(
    () => provider.analyzeJobContent({ rawText: 'test' }),
    (err: unknown) => err instanceof AIProviderError && err.code === 'INVALID_RESPONSE',
  );
  restoreEnv();
});

// J/K. Missing required fields / unexpected response shape
test('J. missing required fields: rejected safely as INVALID_RESPONSE', async (t) => {
  setApiKey('test-key');
  t.mock.method(globalThis, 'fetch', async () =>
    chatCompletionWith(JSON.stringify({ documentType: 'JOB_POSTING' })),
  );

  const provider = new GroqProvider();
  await assert.rejects(
    () => provider.analyzeJobContent({ rawText: 'test' }),
    (err: unknown) => err instanceof AIProviderError && err.code === 'INVALID_RESPONSE',
  );
  restoreEnv();
});

test('K. unexpected documentType value: rejected safely as INVALID_RESPONSE', async (t) => {
  setApiKey('test-key');
  t.mock.method(globalThis, 'fetch', async () =>
    chatCompletionWith(
      JSON.stringify({
        documentType: 'NOT_A_REAL_TYPE',
        documentTypeConfidence: 0.9,
        summary: 'x',
        redFlags: [],
        recommendations: [],
      }),
    ),
  );

  const provider = new GroqProvider();
  await assert.rejects(
    () => provider.analyzeJobContent({ rawText: 'test' }),
    (err: unknown) => err instanceof AIProviderError && err.code === 'INVALID_RESPONSE',
  );
  restoreEnv();
});

test('K(b). redFlags containing non-string elements: rejected safely, not passed through', async (t) => {
  setApiKey('test-key');
  t.mock.method(globalThis, 'fetch', async () =>
    chatCompletionWith(
      JSON.stringify({
        documentType: 'JOB_POSTING',
        documentTypeConfidence: 0.9,
        summary: 'x',
        redFlags: [123, { not: 'a string' }],
        recommendations: [],
      }),
    ),
  );

  const provider = new GroqProvider();
  await assert.rejects(
    () => provider.analyzeJobContent({ rawText: 'test' }),
    (err: unknown) => err instanceof AIProviderError && err.code === 'INVALID_RESPONSE',
  );
  restoreEnv();
});

test('K(c). documentTypeConfidence out of range (NaN/Infinity): rejected safely', async (t) => {
  setApiKey('test-key');
  t.mock.method(globalThis, 'fetch', async () =>
    chatCompletionWith(
      JSON.stringify({
        documentType: 'JOB_POSTING',
        documentTypeConfidence: 1.5,
        summary: 'x',
        redFlags: [],
        recommendations: [],
      }),
    ),
  );

  const provider = new GroqProvider();
  await assert.rejects(
    () => provider.analyzeJobContent({ rawText: 'test' }),
    (err: unknown) => err instanceof AIProviderError && err.code === 'INVALID_RESPONSE',
  );
  restoreEnv();
});

// Sanity check: a genuinely valid response is accepted and derives
// isJobPosting/confidence correctly, so the failure tests above are
// meaningfully exercising rejection paths and not a broken happy path.
test('sanity: a valid response is parsed and derives isJobPosting/confidence correctly', async (t) => {
  setApiKey('test-key');
  const fetchMock = t.mock.fn(async () => chatCompletionWith(VALID_CONTENT));
  t.mock.method(globalThis, 'fetch', fetchMock);

  const provider = new GroqProvider();
  const result = await provider.analyzeJobContent({ rawText: 'test' });

  assert.equal(result.documentType, 'JOB_POSTING');
  assert.equal(result.documentTypeConfidence, 0.9);
  assert.equal(result.isJobPosting, true);
  assert.equal(result.confidence, 0.9);
  assert.equal(fetchMock.mock.callCount(), 1);
  restoreEnv();
});
