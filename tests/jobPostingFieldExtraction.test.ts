import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeJobPosting } from '@/modules/analysis/engine/textNormalizer';

// Regression coverage for the "extractedFields all null" bug reported
// through Swagger/API testing of POST /api/v1/analyses: a real BairesDev
// posting returned companyName/jobTitle/location all null, even though all
// three are clearly present in the text. Root cause (textNormalizer.ts):
//   1. jobTitle/location were never extracted at all, for any input — only
//      contactEmail and companyName had extraction logic.
//   2. companyName's existing patterns are all anchor-phrase based
//      ("Company:", "At X, we", "About X" on the same line, etc.) — this
//      posting's company name sits alone on its own line with no anchor
//      word anywhere near it, so every pattern missed it.

// Case 1: the exact reported posting shape — company name alone on the
// first line, a title line with LinkedIn's "REF#" suffix, a location line,
// separate work-mode/employment-type lines, and the company name repeated
// alone under a standalone "About the company" heading.
const BAIRESDEV_REPORTED_POSTING = `
BairesDev

Java Software Engineer - Remote Work | REF#297056

Lahore, Punjab, Pakistan
Remote
Full-time

About the job

We've been leading the way in technology projects for over 15 years. We
deliver cutting-edge solutions to giants like Google and the most innovative
startups in Silicon Valley.

Develop and maintain robust Java applications that deliver reliable
solutions to meet business objectives.

What You'll Do

Design, develop, and maintain Java applications and backend services.
Build and integrate APIs, microservices, and database systems.

About the company

BairesDev

IT Services and IT Consulting
1001-5000 employees
`;

test('Case 1 — BairesDev-style posting: company, title, and location are all extracted', () => {
  const { extractedFields } = normalizeJobPosting(BAIRESDEV_REPORTED_POSTING);
  assert.equal(extractedFields.companyName, 'BairesDev');
  assert.ok(
    extractedFields.jobTitle?.includes('Java Software Engineer'),
    `expected jobTitle to contain "Java Software Engineer", got: ${extractedFields.jobTitle}`,
  );
  assert.equal(extractedFields.location, 'Lahore, Punjab, Pakistan');
});

test('Case 1b — the REF#/remote-work suffix is stripped from the title, not left attached', () => {
  const { extractedFields } = normalizeJobPosting(BAIRESDEV_REPORTED_POSTING);
  assert.equal(extractedFields.jobTitle, 'Java Software Engineer');
});

// Case 2: a differently-formatted, realistic posting — explicit labeled
// fields instead of LinkedIn's stacked-line layout, proving extraction
// isn't hardcoded to one shape.
const LABELED_STYLE_POSTING = `
Nimbus Data Systems is hiring!

Job Title: Senior Backend Developer
Location: Austin, Texas, United States
Employment Type: Full-time

About the role

We are looking for an experienced backend engineer to join our growing team
and help scale our platform.

Requirements

5+ years of experience with Node.js and TypeScript.
Strong understanding of distributed systems.
`;

test('Case 2 — normal plain-text posting with labeled fields: extraction still works', () => {
  const { extractedFields } = normalizeJobPosting(LABELED_STYLE_POSTING);
  assert.equal(extractedFields.companyName, 'Nimbus Data Systems');
  assert.equal(extractedFields.jobTitle, 'Senior Backend Developer');
  assert.equal(extractedFields.location, 'Austin, Texas, United States');
});

// Case 3: fields genuinely absent from the posting must stay null, not be
// guessed at from ordinary prose.
test('Case 3 — fields genuinely absent from the posting remain null', () => {
  const { extractedFields } = normalizeJobPosting(
    'We are looking for a motivated individual to help with data entry tasks. ' +
      'No experience necessary. Send your resume to apply. Flexible hours and ' +
      'competitive pay.',
  );
  assert.equal(extractedFields.companyName, null);
  assert.equal(extractedFields.jobTitle, null);
  assert.equal(extractedFields.location, null);
});

// Guard against item #9 in the bug report: a client/customer mentioned
// inside the body must never be picked up as the employer.
test('a client company named in the body is not mistaken for the employer', () => {
  const { extractedFields } = normalizeJobPosting(`
Senior Consultant

About the job

You will work directly with our client, Acme Global Bank, to modernize their
payments platform. This is a contract role.
`);
  // No anchor phrase or header structure actually names *our* employer here
  // — "Acme Global Bank" is the client, not the poster — so this must stay
  // null rather than guessing.
  assert.equal(extractedFields.companyName, null);
});

// Work-mode/employment-type lines must never be misread as the location.
test('a bare "Remote" / "Full-time" line is not mistaken for a location', () => {
  const { extractedFields } = normalizeJobPosting(`
Acme Corp

Product Manager

Remote
Full-time

About the job

Acme Corp is looking for a Product Manager to own our roadmap.
`);
  assert.equal(extractedFields.location, null);
});
