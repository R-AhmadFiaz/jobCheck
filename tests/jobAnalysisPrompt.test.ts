import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  JOB_ANALYSIS_SYSTEM_PROMPT,
  buildJobAnalysisPrompt,
} from '@/modules/analysis/ai/prompts/jobAnalysis.prompt';
import { evaluateDocumentClassification } from '@/modules/analysis/ai/documentClassification';
import { mergeAIFindings } from '@/modules/analysis/ai/aiResultMerger';
import type { AIProviderAnalysisResult } from '@/modules/analysis/ai/interfaces/IAIProvider';

// ── Prompt-content regression guards ────────────────────────────────────────
// The manual is prose inside a template string with no compiler to catch a
// future edit silently dropping a section. These assertions exist so that
// happening is a loud, immediate test failure instead of a quiet regression
// back to the over-eager-flagging behavior this phase fixes.

test('the operating manual preserves the exact false-positive rules', () => {
  const prompt = JOB_ANALYSIS_SYSTEM_PROMPT;
  assert.ok(prompt.includes('JobCheck AI'));
  assert.ok(prompt.includes('evidence over assumptions'));
  for (const nonSignal of [
    'a short job description',
    'no salary listed',
    'a startup company',
    'informal writing',
    'remote work',
    'a Gmail contact alone',
  ]) {
    assert.ok(prompt.includes(nonSignal), `expected the manual to still list "${nonSignal}"`);
  }
  assert.ok(prompt.includes('quality matters far more than quantity'));
});

test('the operating manual encodes the exact regression this phase fixes', () => {
  // This literal example is the one that produced 3 spurious AI_DETECTED_SIGNAL
  // flags on a clean, terse posting before this phase's prompt rewrite.
  assert.ok(JOB_ANALYSIS_SYSTEM_PROMPT.includes('Need Python developer remote. Send CV.'));
});

test('the manual keeps internship scams in scope, never skipped', () => {
  assert.ok(
    JOB_ANALYSIS_SYSTEM_PROMPT.includes(
      'internship scams get the exact same scrutiny as job postings, never skipped',
    ),
  );
});

test('buildJobAnalysisPrompt still wraps the raw text unchanged', () => {
  const prompt = buildJobAnalysisPrompt({ rawText: 'Need a Python developer remote. Send CV.' });
  assert.ok(prompt.includes('Need a Python developer remote. Send CV.'));
});

// ── End-to-end scenario simulations ─────────────────────────────────────────
// Groq itself can't be called in a unit test (no network/DB here, same
// constraint as every prior AI-related test file in this project). Instead,
// each scenario simulates the AIProviderAnalysisResult a manual-following
// model SHOULD return, then runs it through the real, unchanged
// evaluateDocumentClassification()/mergeAIFindings() to prove the pipeline
// handles a correctly-behaving AI response the way this phase intends.

function simulate(
  documentType: AIProviderAnalysisResult['documentType'],
  documentTypeConfidence: number,
  redFlags: string[],
  recommendations: string[] = [],
): AIProviderAnalysisResult {
  return {
    documentType,
    documentTypeConfidence,
    isJobPosting: documentType === 'JOB_POSTING' || documentType === 'INTERNSHIP_POSTING',
    confidence: documentTypeConfidence,
    summary: 'Simulated AI response for test purposes.',
    redFlags,
    recommendations,
  };
}

test('scenario: short legitimate job produces no AI-generated flags', () => {
  const aiResult = simulate('JOB_POSTING', 0.85, []);
  const classification = evaluateDocumentClassification(
    aiResult.documentType,
    aiResult.documentTypeConfidence,
  );
  assert.equal(classification.shouldReject, false);

  const merged = mergeAIFindings({ redFlags: [], totalWeight: 0 }, aiResult);
  assert.equal(merged.redFlags.length, 0);
  assert.equal(merged.totalWeight, 0);
});

test('scenario: legitimate internship is analyzed and produces no AI-generated flags', () => {
  const aiResult = simulate('INTERNSHIP_POSTING', 0.9, []);
  const classification = evaluateDocumentClassification(
    aiResult.documentType,
    aiResult.documentTypeConfidence,
  );
  assert.equal(classification.shouldReject, false);

  const merged = mergeAIFindings({ redFlags: [], totalWeight: 0 }, aiResult);
  assert.equal(merged.redFlags.length, 0);
  assert.equal(merged.totalWeight, 0);
});

test('scenario: early-stage startup job is not penalized for being small/new', () => {
  const aiResult = simulate('JOB_POSTING', 0.8, []);
  const merged = mergeAIFindings({ redFlags: [], totalWeight: 0 }, aiResult);
  assert.equal(merged.redFlags.length, 0);
  assert.equal(merged.totalWeight, 0);
});

test('scenario: an obvious scam still produces real, evidence-based AI flags', () => {
  const aiResult = simulate('JOB_POSTING', 0.9, [
    'Promises guaranteed income of $5000/week with no experience required, an unrealistic-earnings pattern.',
  ]);
  const classification = evaluateDocumentClassification(
    aiResult.documentType,
    aiResult.documentTypeConfidence,
  );
  assert.equal(classification.shouldReject, false);

  const merged = mergeAIFindings({ redFlags: [], totalWeight: 0 }, aiResult);
  assert.equal(merged.redFlags.length, 1);
  assert.ok(merged.totalWeight > 0);
});

test('scenario: an internship payment-request scam is still fully analyzed, not skipped', () => {
  const aiResult = simulate('INTERNSHIP_POSTING', 0.92, [
    'Requests a $100 registration fee combined with a "guaranteed" internship outcome — a financial-exploitation pattern.',
  ]);
  const classification = evaluateDocumentClassification(
    aiResult.documentType,
    aiResult.documentTypeConfidence,
  );
  // Internship scams must never be skipped — same pipeline as a job posting.
  assert.equal(classification.shouldReject, false);

  const merged = mergeAIFindings({ redFlags: [], totalWeight: 0 }, aiResult);
  assert.equal(merged.redFlags.length, 1);
  assert.ok(merged.totalWeight > 0);
});
