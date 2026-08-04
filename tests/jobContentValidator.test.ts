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

// The one regression example this whole project repeatedly tracks: thin on
// role/application vocabulary (no tech-role term, no "apply"/"cv"/"resume"),
// centered instead on hiring + payment + urgency + pay language. Must keep
// passing this validator so the (unchanged) rule engine still gets to score
// it — this is what "existing scam analysis pipeline is unchanged" means at
// this validator's boundary.
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

test('unrelated documents (assignments, planning docs, general text) are rejected', () => {
  for (const text of [
    'My database assignment',
    'Project planning notes',
    'Meeting summary',
    'Recipe for pizza',
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

test('generic words that are common in non-job documents never pass alone', () => {
  for (const text of [
    'company',
    'Our company has grown a lot this year.',
    'experience',
    'I have a lot of experience in this field.',
    'project',
    'This project is due next week.',
    'contact',
    'Please contact the front desk for assistance.',
  ]) {
    assert.equal(validateJobContent(text).isJobContent, false, `expected "${text}" to be rejected`);
  }
});

test('short but real job postings are accepted (role + hiring/application signal)', () => {
  for (const text of [
    'Need a Python developer remote. Send CV.',
    'Looking for React developer',
    'Hiring junior backend engineer',
  ]) {
    assert.equal(validateJobContent(text).isJobContent, true, `expected "${text}" to be accepted`);
  }
});

test('requirements + responsibilities is a strong combination that passes', () => {
  const result = validateJobContent(
    'Requirements: 2+ years in a similar field. Responsibilities: manage the daily schedule.',
  );
  assert.equal(result.isJobContent, true);
});

test('skills + experience is a strong combination that passes', () => {
  const result = validateJobContent(
    'Candidates should have strong communication skills and prior experience in retail.',
  );
  assert.equal(result.isJobContent, true);
});

test('a valid job posting is accepted (would proceed to be analyzed)', () => {
  const result = validateJobContent(VALID_JOB_POSTING);
  assert.equal(result.isJobContent, true);
  assert.equal(result.reason, '');
});

test('existing scam analysis pipeline is unchanged: a scam job posting still passes validation', () => {
  const result = validateJobContent(SCAM_JOB_POSTING);
  assert.equal(result.isJobContent, true);
  assert.equal(result.reason, '');
});
