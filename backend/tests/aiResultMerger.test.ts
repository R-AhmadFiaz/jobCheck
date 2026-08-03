import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Types } from 'mongoose';
import { mergeAIFindings } from '@/modules/analysis/ai/aiResultMerger';
import type { AIProviderAnalysisResult } from '@/modules/analysis/ai/interfaces/IAIProvider';
import type { IRedFlag } from '@/modules/analysis/analysis.model';

// Representative rule-engine output for the same canonical scam posting
// used throughout the rest of this project's tests ("Urgent hiring! ...
// registration fee ... remote data-entry job ... salary ... contact via
// gmail ..."), so Case 3 below is testing against a real, tracked shape
// rather than an invented one.
function scamPostingRedFlags(): IRedFlag[] {
  return [
    {
      ruleId: new Types.ObjectId(),
      label: 'UPFRONT_PAYMENT_REQUEST',
      description: 'Detects requests for an upfront payment... | Category: payment | Evidence: matched phrase "registration fee" | Recommendation: ...',
      weight: 32,
      severity: 'high',
    },
    {
      ruleId: new Types.ObjectId(),
      label: 'URGENCY_PRESSURE_LANGUAGE',
      description: 'Detects urgency... | Category: urgency | Evidence: matched phrase "urgent hiring" | Recommendation: ...',
      weight: 18,
      severity: 'medium',
    },
    {
      ruleId: new Types.ObjectId(),
      label: 'MISSING_COMPANY_NAME',
      description: 'Detects postings that never name the company. | Category: company_info | Evidence: no companyName could be identified | Recommendation: ...',
      weight: 18,
      severity: 'medium',
    },
  ];
}

const SCAM_BASE_WEIGHT = 32 + 18 + 18; // 68

function legitimateJobRedFlags(): IRedFlag[] {
  // A clean posting with a real company name and nothing suspicious — no
  // base flags matched at all.
  return [];
}

const VALID_AI_RESULT: AIProviderAnalysisResult = {
  documentType: 'JOB_POSTING',
  documentTypeConfidence: 0.9,
  isJobPosting: true,
  confidence: 0.9,
  summary: 'This posting asks for payment before employment begins, which is a common fraud pattern.',
  redFlags: ['Asks the candidate to pay for a "starter kit" via an unusual channel'],
  recommendations: ['Do not send any payment to receive a job offer.'],
};

// ── Case 1: Groq configured and returns a valid response ───────────────────
test('Case 1: a valid AI result merges in alongside existing rule findings', () => {
  const base = { redFlags: scamPostingRedFlags(), totalWeight: SCAM_BASE_WEIGHT };
  const merged = mergeAIFindings(base, VALID_AI_RESULT);

  // Existing rule findings remain, unmodified, in their original order.
  assert.equal(merged.redFlags.length, base.redFlags.length + 1);
  for (const original of base.redFlags) {
    assert.ok(merged.redFlags.some((f) => f.label === original.label && f.weight === original.weight));
  }

  // The AI finding merges in as one additional, low-severity, low-weight flag.
  const aiFlag = merged.redFlags.find((f) => f.label.startsWith('AI_DETECTED_SIGNAL_'));
  assert.ok(aiFlag);
  assert.equal(aiFlag?.severity, 'low');
  assert.ok(aiFlag!.description.includes('starter kit'));

  assert.equal(merged.totalWeight, SCAM_BASE_WEIGHT + 4);
  assert.equal(merged.aiConfidence, 0.9);
  assert.ok(merged.aiExplanation?.includes('payment before employment'));
});

// ── Case 2: Groq unavailable ────────────────────────────────────────────────
test('Case 2: a null AI result (unavailable/disabled/failed) is a no-op', () => {
  const base = { redFlags: scamPostingRedFlags(), totalWeight: SCAM_BASE_WEIGHT };
  const merged = mergeAIFindings(base, null);

  assert.deepEqual(merged.redFlags, base.redFlags);
  assert.equal(merged.totalWeight, base.totalWeight);
  assert.equal(merged.aiExplanation, null);
  assert.equal(merged.aiConfidence, null);
});

// ── Case 3: existing scam test — score behavior is not broken ─────────────
test('Case 3: the existing scam posting behavior is unchanged when AI is unavailable', () => {
  const base = { redFlags: scamPostingRedFlags(), totalWeight: SCAM_BASE_WEIGHT };
  const merged = mergeAIFindings(base, null);

  // Same three flags, same weight, same total — nothing about the existing,
  // already-tracked scam-detection behavior changed by introducing AI.
  assert.equal(merged.redFlags.length, 3);
  assert.equal(merged.totalWeight, 68);
});

// ── Case 4: normal legitimate job — no unnecessary AI-generated scam flags ─
test('Case 4: a legitimate job with no AI-reported red flags adds no scam flags or weight', () => {
  const base = { redFlags: legitimateJobRedFlags(), totalWeight: 0 };
  const cleanAIResult: AIProviderAnalysisResult = {
    documentType: 'JOB_POSTING',
    documentTypeConfidence: 0.95,
    isJobPosting: true,
    confidence: 0.95,
    summary: 'This appears to be a standard, legitimate job posting with no notable red flags.',
    redFlags: [],
    recommendations: [],
  };

  const merged = mergeAIFindings(base, cleanAIResult);

  assert.equal(merged.redFlags.length, 0);
  assert.equal(merged.totalWeight, 0);
  // The explanation can still surface (reassuring context is still useful),
  // it just never invents a scam flag that doesn't exist.
  assert.ok(merged.aiExplanation?.includes('legitimate job posting'));
});

// ── Safety limits (requirement 4) ───────────────────────────────────────────
test('safety limit: AI-reported flags are capped, so AI can never dominate the score', () => {
  const base = { redFlags: [], totalWeight: 0 };
  const hallucinating: AIProviderAnalysisResult = {
    documentType: 'JOB_POSTING',
    documentTypeConfidence: 0.99,
    isJobPosting: true,
    confidence: 0.99,
    summary: 'Extremely suspicious posting.',
    redFlags: Array.from({ length: 50 }, (_, i) => `Suspicious pattern number ${i + 1}`),
    recommendations: [],
  };

  const merged = mergeAIFindings(base, hallucinating);

  // Capped at 5 flags / 20 total weight, no matter how many the provider claims.
  assert.equal(merged.redFlags.length, 5);
  assert.equal(merged.totalWeight, 20);
});

test('safety limit: a low-confidence AI result is not trusted at all', () => {
  const base = { redFlags: [], totalWeight: 0 };
  const uncertain: AIProviderAnalysisResult = {
    documentType: 'JOB_POSTING',
    documentTypeConfidence: 0.2,
    isJobPosting: true,
    confidence: 0.2,
    summary: 'Not sure about this one.',
    redFlags: ['Possibly suspicious wording'],
    recommendations: [],
  };

  const merged = mergeAIFindings(base, uncertain);

  assert.equal(merged.redFlags.length, 0);
  assert.equal(merged.totalWeight, 0);
  assert.equal(merged.aiExplanation, null);
});

test('safety limit: AI saying this is not even a job posting is not trusted', () => {
  const base = { redFlags: [], totalWeight: 0 };
  const notAJob: AIProviderAnalysisResult = {
    documentType: 'RESUME_CV',
    documentTypeConfidence: 0.9,
    isJobPosting: false,
    confidence: 0.9,
    summary: 'This does not look like a job posting.',
    redFlags: ['Unrelated content'],
    recommendations: [],
  };

  const merged = mergeAIFindings(base, notAJob);

  assert.equal(merged.redFlags.length, 0);
  assert.equal(merged.totalWeight, 0);
});
