// Deterministic gate that runs before the rule engine ever sees the text
// (§8 of docs/ARCHITECTURE.md — Job Content Validation layer). Purely local
// pattern matching: no Gemini, no external API, no DB access, and it never
// touches ruleEngine.ts/scoring.ts. Its only job is to answer one narrow
// question — "does this text look related to employment/recruitment enough
// to analyze?" — not whether the job is legitimate. A scam job posting is
// still a job posting and must pass through unchanged, exactly like the
// advisory Gemini validation layer's own rule (see gemini.service.ts's
// prompt).
//
// This exists because rules like MISSING_COMPANY_NAME match on the ABSENCE
// of a signal, so any text — job-related or not — that lacks a detectable
// company name accumulates weight and produces a non-zero risk score. This
// layer stops that class of false positive before scoring ever runs.
//
// Balanced-confidence design (replaces the earlier single-keyword-OR
// approach): no single category match is ever sufficient by itself — a
// document only passes if at least one of a small set of named, genuinely
// job-specific COMBINATIONS is present. Generic professional/academic words
// ("requirements", "experience", "company", "project", "contact"...) are
// exactly the kind of vocabulary that shows up in university assignments,
// planning documents, and general PDFs, so a single hit on one of them can
// no longer pass on its own — it always needs a second, independent signal.

// Tech/professional titles. A bare mention of one of these is specific
// enough that it's the anchor half of two of the four combinations below,
// but — unlike the previous version — it is never sufficient alone.
const ROLE_TERMS = [
  'developer',
  'developers',
  'engineer',
  'engineers',
  'designer',
  'designers',
  'programmer',
  'programmers',
  'intern',
  'internship',
  'manager',
  'managers',
  'analyst',
  'analysts',
  'architect',
  'devops',
  'frontend',
  'front-end',
  'backend',
  'back-end',
  'full stack',
  'fullstack',
  'full-stack',
  'python',
  'javascript',
  'typescript',
  'java',
  'react',
  'reactjs',
  'angular',
  'vue',
  'node',
  'nodejs',
  'sql',
  'aws',
  'docker',
  'kubernetes',
  'php',
  'ruby',
  'golang',
  'swift',
  'kotlin',
  'html',
  'css',
];

// Phrases an employer uses to announce an opening.
const HIRING_SIGNALS = [
  'hire',
  'hiring',
  'hired',
  'looking for',
  'need',
  'seeking',
  'recruit',
  'recruiting',
  'recruiter',
  'recruiters',
  'recruitment',
  'vacancy',
  'vacancies',
  'opening',
  'openings',
  'opportunity',
  'opportunities',
  'position',
  'positions',
  'role',
  'roles',
  'job',
  'jobs',
];

// Phrases a candidate is told to act on. Deliberately does NOT include bare
// "contact" — it's one of the most overloaded words in non-job documents
// ("Contact table" in a database schema, "emergency contact", a generic
// "Contact us" footer) and was explicitly called out as a word that must
// never pass on its own.
const APPLICATION_SIGNALS = [
  'apply',
  'applying',
  'applicant',
  'applicants',
  'application',
  'apply now',
  'send cv',
  'send resume',
  'cv',
  'resume',
  'résumé',
  'cover letter',
  'submit',
  'candidate',
  'candidates',
  'interview',
  'interviewing',
  'shortlisted',
  'offer letter',
  'onboarding',
  'headhunter',
];

// Terms describing the working arrangement itself — used only to pair with
// a hiring signal (combination 5 below). Deliberately excludes
// "requirements"/"responsibilities", which are reserved for their own,
// more specific pairing (combination 3), so the two pathways stay distinct
// and don't let a single vague word satisfy either one.
const EMPLOYMENT_CONTEXT = [
  'remote work',
  'remote job',
  'remote',
  'freelance',
  'full-time',
  'full time',
  'part-time',
  'part time',
  'contractor',
  'hybrid work',
  'on-site position',
  'work from home',
  'salary',
  'salaries',
  'wage',
  'wages',
  'compensation',
  'hourly rate',
  'per hour',
  'per week',
  'per month',
  'per annum',
  'benefits package',
  'bonus',
  'stipend',
  'paycheck',
  'qualification',
  'qualifications',
  'eligibility criteria',
  'job description',
  'job title',
  'employer',
  'hiring manager',
  'human resources',
  'hr department',
  'job seeker',
  'job seekers',
  'career',
  'careers',
  'employment',
  'occupation',
];

function buildPattern(terms: string[]): RegExp {
  return new RegExp(
    `\\b(${terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
    'i',
  );
}

// Built once at module load: one alternation regex per category instead of
// re-scanning a single giant list — and, critically, kept separate so each
// combination below can check its two halves independently.
const ROLE_PATTERN = buildPattern(ROLE_TERMS);
const HIRING_PATTERN = buildPattern(HIRING_SIGNALS);
const APPLICATION_PATTERN = buildPattern(APPLICATION_SIGNALS);
const EMPLOYMENT_CONTEXT_PATTERN = buildPattern(EMPLOYMENT_CONTEXT);
const REQUIREMENTS_PATTERN = buildPattern(['requirements']);
const RESPONSIBILITIES_PATTERN = buildPattern(['responsibilities']);
const SKILLS_PATTERN = buildPattern(['skills']);
const EXPERIENCE_PATTERN = buildPattern(['experience']);

export interface JobContentValidationResult {
  isJobContent: boolean;
  reason: string;
  // 0..1, internal only — not part of any API response. Reflects how many
  // of the named combinations below matched, not a single keyword count, so
  // it stays meaningful under the balanced-confidence design. See
  // analysis.service.ts's dev-only debug log.
  confidence: number;
}

export const NON_JOB_CONTENT_MESSAGE =
  'This does not appear to be a job posting, offer, or recruitment message. Please enter a job description, recruitment message, or offer letter to analyze.';

/**
 * Balanced-confidence, combination-based gate: checks whether the text
 * signals employment/recruitment intent, not whether it reads like a
 * complete, well-formed job ad, and never judges whether the job itself is
 * legitimate (that is the rule engine's job, unchanged, downstream of this
 * gate). Unlike the previous version, no single category — not even a
 * role/tech term — passes on its own; at least one of these named
 * combinations must be present:
 *
 *   1. role term + application signal
 *   2. role term + hiring signal
 *   3. "requirements" + "responsibilities"
 *   4. "skills" + "experience"
 *   5. hiring signal + employment-context term
 *
 * (5) exists specifically so genuinely thin scam postings that center on
 * hiring/payment/urgency language rather than a named tech role — e.g.
 * "Urgent hiring! ... this remote data-entry job ... $9000/month salary
 * ..." — still pass through to the rule engine unchanged; without it, that
 * class of scam posting would be wrongly rejected here instead of scored.
 *
 * Generic words that are individually common in non-job documents —
 * "company", "experience", "project", "contact" — can never satisfy any
 * combination alone by construction: "project"/"company" aren't in any
 * category list at all, "contact" was removed from application signals,
 * and "experience" only counts when paired with "skills".
 */
export function validateJobContent(rawText: string): JobContentValidationResult {
  const hasRole = ROLE_PATTERN.test(rawText);
  const hasHiring = HIRING_PATTERN.test(rawText);
  const hasApplication = APPLICATION_PATTERN.test(rawText);
  const hasContext = EMPLOYMENT_CONTEXT_PATTERN.test(rawText);
  const hasRequirements = REQUIREMENTS_PATTERN.test(rawText);
  const hasResponsibilities = RESPONSIBILITIES_PATTERN.test(rawText);
  const hasSkills = SKILLS_PATTERN.test(rawText);
  const hasExperience = EXPERIENCE_PATTERN.test(rawText);

  const matchedCombinations = [
    hasRole && hasApplication,
    hasRole && hasHiring,
    hasRequirements && hasResponsibilities,
    hasSkills && hasExperience,
    hasHiring && hasContext,
  ].filter(Boolean).length;

  const isJobContent = matchedCombinations > 0;

  // Advisory only — not used to decide isJobContent (that stays a strict
  // combination check, which is what makes "generic words never pass
  // alone" a guarantee). Rewards multiple independent combinations
  // agreeing, same idea as the rule engine's per-flag confidence.
  const signalCount = [
    hasRole,
    hasHiring,
    hasApplication,
    hasContext,
    hasRequirements,
    hasResponsibilities,
    hasSkills,
    hasExperience,
  ].filter(Boolean).length;
  const confidence = isJobContent
    ? Math.min(1, 0.6 + 0.15 * (matchedCombinations - 1))
    : Math.min(0.4, signalCount * 0.1);

  return {
    isJobContent,
    reason: isJobContent ? '' : NON_JOB_CONTENT_MESSAGE,
    confidence,
  };
}
