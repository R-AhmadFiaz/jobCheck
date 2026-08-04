import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeJobPosting } from '@/modules/analysis/engine/textNormalizer';

// Regression coverage for the PakWheels false-positive bug: the deterministic
// company-name extraction (Stage 1, textNormalizer.ts) was requiring a
// literal lowercase "at" ("\bat\s+..."), so sentence-initial "At PakWheels,
// we take pride..." never matched — "At" is capitalized there, same as in
// any real prose. That made MISSING_COMPANY_NAME fire on a posting that
// plainly names its employer, even though the AI layer (unrelated,
// independent path) correctly identified the company.

test('A: "At X, we..." — the exact PakWheels construction', () => {
  const { extractedFields } = normalizeJobPosting(
    'At PakWheels, we take pride in fostering a dynamic and innovative workplace culture.',
  );
  assert.equal(extractedFields.companyName, 'PakWheels');
});

test('B: "X is hiring..."', () => {
  const { extractedFields } = normalizeJobPosting('PakWheels is hiring a Backend Engineer.');
  assert.equal(extractedFields.companyName, 'PakWheels');
});

test('C: "About the company: X"', () => {
  const { extractedFields } = normalizeJobPosting('About the company: Acme Technologies');
  assert.equal(extractedFields.companyName, 'Acme Technologies');
});

test('D: "Join the X team"', () => {
  const { extractedFields } = normalizeJobPosting(
    'Join the Microsoft team as a Software Engineer.',
  );
  assert.equal(extractedFields.companyName, 'Microsoft');
});

test('E: "Company: X" with a multi-word name', () => {
  const { extractedFields } = normalizeJobPosting('Company: Example AI Labs');
  assert.equal(extractedFields.companyName, 'Example AI Labs');
});

test('F: a legitimate posting with no identifiable company name stays null', () => {
  const { extractedFields } = normalizeJobPosting(
    'We are looking for a motivated individual to join our growing team. ' +
      'Responsibilities include managing projects and communicating with clients. ' +
      'Competitive salary and benefits. Apply today!',
  );
  assert.equal(extractedFields.companyName, null);
});

test('G: a random capitalized phrase that is not a company is not misclassified as one', () => {
  const { extractedFields } = normalizeJobPosting(
    'We value Strong Communication Skills and a Positive Attitude in every candidate. ' +
      'This is a great opportunity for growth and career development.',
  );
  // Must not have grabbed "Strong", "Communication Skills", "Positive
  // Attitude", or any other mid-sentence Title Case phrase as a company —
  // none of them follow a real company-indicating anchor (at/about/join/
  // company:/hiring), so this must stay null rather than guessing.
  assert.equal(extractedFields.companyName, null);
});

test('additional patterns from the brief: "About PakWheels" heading style', () => {
  const { extractedFields } = normalizeJobPosting(
    'About PakWheels\n\nPakWheels.com is a leading platform in Pakistan.',
  );
  assert.equal(extractedFields.companyName, 'PakWheels');
});

test('additional patterns from the brief: "We are hiring at X"', () => {
  const { extractedFields } = normalizeJobPosting(
    'We are hiring at PakWheels for a Senior Backend role.',
  );
  assert.equal(extractedFields.companyName, 'PakWheels');
});

test('additional patterns from the brief: "This role at X"', () => {
  const { extractedFields } = normalizeJobPosting(
    'This role at PakWheels reports directly to the Head of Engineering.',
  );
  assert.equal(extractedFields.companyName, 'PakWheels');
});

test('bare "Company.com" mention with no other signal falls back to the domain form', () => {
  const { extractedFields } = normalizeJobPosting(
    'Since 2003, PakWheels.com has transformed the automobile industry in Pakistan.',
  );
  assert.equal(extractedFields.companyName, 'PakWheels.com');
});

test('does not swallow the trailing comma from "At X, we..." into the captured name', () => {
  const { extractedFields } = normalizeJobPosting('At Acme Corp, we believe in doing things right.');
  assert.equal(extractedFields.companyName?.endsWith(','), false);
});

test('"About Us" / "About This Role" headings are not misclassified as company names', () => {
  assert.equal(normalizeJobPosting('About Us\n\nWe are a growing team.').extractedFields.companyName, null);
  assert.equal(
    normalizeJobPosting('About This Role\n\nYou will own the roadmap.').extractedFields.companyName,
    null,
  );
});

test('ordinary "at <place/time>" phrasing is not mistaken for a company name', () => {
  const { extractedFields } = normalizeJobPosting(
    'The role is based at Lahore, Punjab, Pakistan and requires occasional travel.',
  );
  assert.equal(extractedFields.companyName, null);
});

// The complete real-world posting from the manual bug report (requirement
// #13) — not a trimmed sentence, the full multi-paragraph LinkedIn-style
// text, to prove the fix holds up against realistic surrounding content
// (headings, metadata line, unrelated body copy) and not just an isolated
// fragment.
const PAKWHEELS_FULL_POSTING = `
Technical Engineering Lead – AI & Agentic Systems

Lahore, Punjab, Pakistan · 1 month ago · Over 100 people clicked apply

Full-time · Mid-Senior level · Engineering · Information Technology

About the job

As an Technical Engineering Lead, you will lead a team of engineers building
and shipping AI-powered, agentic systems end to end. You will partner with
product and design to define technical direction, mentor senior and mid-level
engineers, and hold a high bar for code quality, reliability, and delivery
speed.

Responsibilities

- Lead architecture and technical decisions for agentic AI systems
- Mentor and grow a team of backend and AI/ML engineers
- Partner cross-functionally with product, design, and data teams
- Own delivery timelines and technical quality for your team's roadmap
- Champion engineering best practices: code review, testing, CI/CD

Requirements

- 6+ years of software engineering experience, including 2+ years leading
  engineers
- Strong experience with backend systems, APIs, and cloud infrastructure
- Hands-on experience with LLM-based or agentic AI systems is a strong plus
- Excellent communication and mentorship skills

At PakWheels, we take pride in fostering a dynamic and innovative workplace
culture that values collaboration and growth. Since 2003, PakWheels.com has
transformed the automobile industry in Pakistan by connecting millions of
buyers and sellers, and we continue to invest heavily in engineering talent
to build the next generation of our platform.

We offer a competitive salary, comprehensive health benefits, and a
collaborative, engineering-driven culture. Apply now to join our team.
`;

test('full PakWheels posting: company is detected as PakWheels', () => {
  const { extractedFields } = normalizeJobPosting(PAKWHEELS_FULL_POSTING);
  assert.equal(extractedFields.companyName, 'PakWheels');
});
