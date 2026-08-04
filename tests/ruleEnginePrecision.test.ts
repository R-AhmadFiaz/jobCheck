import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Types } from 'mongoose';
import {
  matchKeyword,
  matchFieldPresence,
  findMatches,
  containsTerm,
  type KeywordMatcherConfig,
  type FieldPresenceMatcherConfig,
} from '@/modules/analysis/engine/ruleEngine';
import { applyRuleCorrelations } from '@/modules/analysis/engine/correlationEngine';
import { normalizeJobPosting } from '@/modules/analysis/engine/textNormalizer';
import type { IRedFlag, IExtractedFields } from '@/modules/analysis/analysis.model';

// These mirror the *current* seedScamRules.ts definitions for
// UPFRONT_PAYMENT_REQUEST and VAGUE_COMPANY_DESCRIPTION after the BairesDev
// false-positive fix. Kept as local literals (not imported from the seed
// script, which is a standalone executable, not a module of exported
// configs) so this test independently pins down the exact matching
// *behavior* the rules must have, regardless of how the seed data happens
// to be structured.
const UPFRONT_PAYMENT_REQUEST: KeywordMatcherConfig = {
  type: 'keyword',
  keywords: [
    'registration fee',
    'processing fee',
    'application fee',
    'training fee',
    'equipment fee',
    'security deposit',
    'refundable deposit',
    'pay before you start',
    'pay to apply',
    'starter kit fee',
  ],
  weakKeywords: ['fee'],
  contextKeywords: [
    'upfront',
    'refundable',
    'before you start',
    'before you begin',
    'before you can start',
    'processing charge',
    'wire transfer',
    'money order',
    'must pay',
    'required to pay',
    'to secure your position',
    'to activate your account',
  ],
  recommendation: 'test',
};

const VAGUE_COMPANY_DESCRIPTION: KeywordMatcherConfig = {
  type: 'keyword',
  keywords: [
    'a leading company',
    'a fast growing organization',
    'confidential company',
    'a well known company',
  ],
  weakKeywords: ['our client'],
  contextKeywords: [
    'is hiring',
    'is seeking',
    'is looking for',
    'on behalf of',
    "client's name is confidential",
    'undisclosed company',
  ],
  recommendation: 'test',
};

const MISSING_COMPANY_NAME_MATCHER: FieldPresenceMatcherConfig = {
  type: 'fieldPresence',
  requiredField: 'companyName',
  recommendation: 'test',
};

function redFlag(label: string, weight = 32): IRedFlag {
  return {
    ruleId: new Types.ObjectId(),
    label,
    description: `${label} | Category: test | Evidence: test | Recommendation: test`,
    weight,
    severity: 'high',
  };
}

// ─── Word-boundary substring fix (findMatches/containsTerm) ────────────────

test('containsTerm: a single-word term does not match inside an unrelated word ("fee" in "coffee")', () => {
  assert.equal(containsTerm('enjoy free coffee every day', 'fee'), false);
  assert.equal(containsTerm('feedback is welcome', 'fee'), false);
});

test('containsTerm: a single-word term still matches as a real standalone word', () => {
  assert.equal(containsTerm('there is a fee for this', 'fee'), true);
});

test('containsTerm: multi-word phrases keep substring matching (so plurals still match)', () => {
  assert.equal(containsTerm('please note the registration fees are non-refundable', 'registration fee'), true);
});

test('findMatches: filters using the same word-boundary rule', () => {
  assert.deepEqual(findMatches('free coffee and great benefits', ['fee']), []);
  assert.deepEqual(findMatches('a small fee applies', ['fee']), ['fee']);
});

// ─── E: benign posting mentioning compensation/benefits does not trigger
//        UPFRONT_PAYMENT_REQUEST ───────────────────────────────────────────

test('E: benign benefits copy (including "coffee") does not trigger Upfront Payment Request', () => {
  const { normalizedText } = normalizeJobPosting(
    'We offer competitive compensation, health benefits, free coffee, and a $500 referral fee for successful hires. Apply today for this exciting position.',
  );
  const outcome = matchKeyword(normalizedText, UPFRONT_PAYMENT_REQUEST);
  assert.equal(outcome.matched, false);
});

// ─── F: a genuine upfront-payment request still triggers the rule ─────────

test('F: "Pay a $50 registration fee before starting" still triggers Upfront Payment Request', () => {
  const { normalizedText } = normalizeJobPosting(
    'Pay a $50 registration fee before starting your first shift.',
  );
  const outcome = matchKeyword(normalizedText, UPFRONT_PAYMENT_REQUEST);
  assert.equal(outcome.matched, true);
  assert.match(outcome.evidence, /registration fee/);
});

test('F variant: a novel phrasing of a real fee demand (not one of the fixed strong phrases) is still caught via reinforced context', () => {
  const { normalizedText } = normalizeJobPosting(
    'There is a small fee required to activate your account before you can start.',
  );
  const outcome = matchKeyword(normalizedText, UPFRONT_PAYMENT_REQUEST);
  assert.equal(outcome.matched, true);
});

// ─── G: "our clients" in an ordinary company description does not trigger
//        VAGUE_COMPANY_DESCRIPTION ─────────────────────────────────────────

test('G: "Our clients include..." as ordinary company description does not trigger Vague Company Description', () => {
  const { normalizedText } = normalizeJobPosting(
    'We are a technology consultancy. Our clients include Fortune 500 companies and fast-growing startups across multiple industries.',
  );
  const outcome = matchKeyword(normalizedText, VAGUE_COMPANY_DESCRIPTION);
  assert.equal(outcome.matched, false);
});

// ─── H: a genuine anonymous-employer-plus-payment posting still triggers
//        the appropriate signals ───────────────────────────────────────────

test('H: "Our client is hiring... pay a registration fee" triggers both Vague Company Description and Upfront Payment Request', () => {
  const { normalizedText } = normalizeJobPosting(
    'Our client is hiring. Send your application and pay a registration fee to proceed.',
  );
  const vagueOutcome = matchKeyword(normalizedText, VAGUE_COMPANY_DESCRIPTION);
  const paymentOutcome = matchKeyword(normalizedText, UPFRONT_PAYMENT_REQUEST);
  assert.equal(vagueOutcome.matched, true);
  assert.equal(paymentOutcome.matched, true);
});

// ─── C: Missing Company Name does not fire when a company is present ──────

test('C: Missing Company Name does not fire once BairesDev is extracted', () => {
  const { extractedFields } = normalizeJobPosting(
    "At BairesDev®, we've been leading the way in technology projects for over 15 years.",
  );
  assert.equal(extractedFields.companyName, 'BairesDev');
  const outcome = matchFieldPresence(extractedFields, MISSING_COMPANY_NAME_MATCHER);
  assert.equal(outcome.matched, false);
});

test('C variant: Missing Company Name DOES fire when no company can be identified', () => {
  const emptyFields: IExtractedFields = {
    companyName: null,
    jobTitle: null,
    salaryRange: null,
    contactEmail: null,
    contactPhone: null,
    location: null,
  };
  const outcome = matchFieldPresence(emptyFields, MISSING_COMPANY_NAME_MATCHER);
  assert.equal(outcome.matched, true);
});

// ─── D: Anonymous Employer Payment Pattern does not fire when a company is
//        present (it requires MISSING_COMPANY_NAME + UPFRONT_PAYMENT_REQUEST
//        together — removing one flag must remove the correlation too) ────

test('D: Anonymous Employer Payment Pattern does not fire when the company is known (only Upfront Payment Request present)', () => {
  const { correlationFlags } = applyRuleCorrelations([redFlag('UPFRONT_PAYMENT_REQUEST')]);
  assert.equal(correlationFlags.some((f) => f.label === 'ANONYMOUS_EMPLOYER_PAYMENT_PATTERN'), false);
});

test('D variant: Anonymous Employer Payment Pattern DOES fire when both prerequisite flags are present', () => {
  const { correlationFlags } = applyRuleCorrelations([
    redFlag('MISSING_COMPANY_NAME', 18),
    redFlag('UPFRONT_PAYMENT_REQUEST'),
  ]);
  assert.equal(correlationFlags.some((f) => f.label === 'ANONYMOUS_EMPLOYER_PAYMENT_PATTERN'), true);
});
