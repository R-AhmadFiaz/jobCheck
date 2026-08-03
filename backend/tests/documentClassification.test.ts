import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateDocumentClassification } from '@/modules/analysis/ai/documentClassification';

// 1. Resume containing Gmail → classified as RESUME_CV → no scam analysis.
test('Case 1: a resume/CV is rejected before it can reach the rule engine', () => {
  const decision = evaluateDocumentClassification('RESUME_CV', 0.92);
  assert.equal(decision.shouldReject, true);
  assert.ok(decision.message?.toLowerCase().includes('resume'));
});

// 2. University assignment PDF → classified as ASSIGNMENT → analysis skipped.
test('Case 2: a university assignment is rejected, analysis skipped', () => {
  const decision = evaluateDocumentClassification('ASSIGNMENT', 0.88);
  assert.equal(decision.shouldReject, true);
  assert.ok(decision.message?.toLowerCase().includes('assignment'));
});

// 3. Software internship posting → classified as INTERNSHIP_POSTING → full
// scam analysis (internship scams are real and must go through the exact
// same pipeline as a job posting).
test('Case 3: an internship posting is NOT rejected — it gets the full pipeline', () => {
  const decision = evaluateDocumentClassification('INTERNSHIP_POSTING', 0.9);
  assert.equal(decision.shouldReject, false);
  assert.equal(decision.message, null);
});

// 4. Legitimate software engineer job → classified as JOB_POSTING → full analysis.
test('Case 4: a legitimate job posting is NOT rejected', () => {
  const decision = evaluateDocumentClassification('JOB_POSTING', 0.93);
  assert.equal(decision.shouldReject, false);
});

// 5. Known scam job posting → still classified as JOB_POSTING (being a scam
// does not change the document type) → still analyzed; the rule engine
// downstream is what determines it's high risk, unchanged by this gate.
test('Case 5: a scam job posting is still classified as JOB_POSTING and analyzed', () => {
  const decision = evaluateDocumentClassification('JOB_POSTING', 0.85);
  assert.equal(decision.shouldReject, false);
});

// 6. Company profile brochure → classified as COMPANY_PROFILE → analysis skipped.
test('Case 6: a company profile brochure is rejected, analysis skipped', () => {
  const decision = evaluateDocumentClassification('COMPANY_PROFILE', 0.8);
  assert.equal(decision.shouldReject, true);
  assert.ok(decision.message?.toLowerCase().includes('company profile'));
});

test('every non-employment document type produces a rejection at high confidence', () => {
  const nonEmploymentTypes = [
    'RESUME_CV',
    'COVER_LETTER',
    'PORTFOLIO',
    'ASSIGNMENT',
    'PROJECT_REPORT',
    'ACADEMIC_DOCUMENT',
    'COMPANY_PROFILE',
    'GENERAL_DOCUMENT',
    'UNKNOWN',
  ] as const;
  for (const type of nonEmploymentTypes) {
    const decision = evaluateDocumentClassification(type, 0.8);
    assert.equal(decision.shouldReject, true, `expected ${type} to be rejected`);
    assert.ok(decision.message, `expected ${type} to have a rejection message`);
  }
});

test('a low-confidence non-employment classification does not block analysis', () => {
  // Blocking a real job posting on a shaky misclassification is worse than
  // occasionally letting a non-job document reach the (unchanged)
  // deterministic pipeline — the pre-existing jobContentValidator gate is
  // still running upstream regardless.
  const decision = evaluateDocumentClassification('RESUME_CV', 0.4);
  assert.equal(decision.shouldReject, false);
  assert.equal(decision.message, null);
});
