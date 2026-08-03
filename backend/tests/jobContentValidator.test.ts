import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateJobContent } from '@/modules/analysis/engine/jobContentValidator';

const VALID_JOB_POSTING = `
We are looking for a Senior Software Engineer to join our team at Acme Corp.
Responsibilities include developing web applications and collaborating with
cross-functional teams. Requirements: 3+ years of experience with JavaScript
and React. We offer a competitive salary, health benefits, and remote work
flexibility. To apply, please send your resume and cover letter to
careers@acme.com.
`;

const SCAM_JOB_POSTING = `
Urgent hiring! Pay a $200 registration fee upfront to secure this remote
data-entry job with amazing $9000/month salary, contact via gmail personal
account only.
`;

test('random, non-job sentence is rejected', () => {
  const result = validateJobContent('I love pizza with illogic words');
  assert.equal(result.isJobContent, false);
  assert.ok(result.reason.length > 0);
});

test('other clearly unrelated text is rejected', () => {
  for (const text of [
    'hello',
    'asdfgh',
    'I want a laptop',
    'eat pizza now',
    'beautiful weather today',
    'I love football',
  ]) {
    assert.equal(validateJobContent(text).isJobContent, false, `expected "${text}" to be rejected`);
  }
});

test('short but real job postings are accepted (intent, not completeness)', () => {
  for (const text of [
    'Need a Python developer remote. Send CV.',
    'Looking for React developer',
    'Hiring junior backend engineer',
  ]) {
    assert.equal(validateJobContent(text).isJobContent, true, `expected "${text}" to be accepted`);
  }
});

test('a valid job posting is accepted (would proceed to be analyzed)', () => {
  const result = validateJobContent(VALID_JOB_POSTING);
  assert.equal(result.isJobContent, true);
  assert.equal(result.reason, '');
});

test('a scam job posting is still accepted — being scammy is not the same as not being a job posting', () => {
  const result = validateJobContent(SCAM_JOB_POSTING);
  assert.equal(result.isJobContent, true);
  assert.equal(result.reason, '');
});
