// Deterministic, keyword-based gate that runs before the rule engine ever
// sees the text (§8 of docs/ARCHITECTURE.md — Job Content Validation layer).
// Purely local pattern matching: no Gemini, no external API, no DB access,
// and it never touches ruleEngine.ts/scoring.ts. Its only job is to answer
// one narrow question — "does this text look related to employment/
// recruitment enough to analyze?" — not whether the job is legitimate. A
// scam job posting is still a job posting and must pass through unchanged,
// exactly like the advisory Gemini validation layer's own rule (see
// gemini.service.ts's prompt).
//
// This exists because rules like MISSING_COMPANY_NAME match on the ABSENCE
// of a signal, so any text — job-related or not — that lacks a detectable
// company name accumulates weight and produces a non-zero risk score. This
// layer stops that class of false positive before scoring ever runs.

// Four categories of signal, any ONE of which is enough on its own (see
// validateJobContent below) — intent-based, not completeness-based. A short,
// real posting like "Need a Python developer remote. Send CV." should pass
// on a single strong signal, not be penalized for lacking the others.
const JOB_KEYWORDS = [
  // Job roles — a bare mention of a common role or tech skill is treated as
  // a strong signal on its own, since a job ad for one is virtually always
  // phrased around these terms, even in a very short posting.
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

  // Hiring signals — phrases an employer uses to announce an opening.
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

  // Application signals — phrases a candidate is told to act on.
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
  'contact',
  'submit',
  'candidate',
  'candidates',
  'interview',
  'interviewing',
  'shortlisted',
  'offer letter',
  'onboarding',
  'headhunter',

  // Employment context — terms describing the working arrangement or the
  // posting's own structure.
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
  'experience',
  'years of experience',
  'skills',
  'qualification',
  'qualifications',
  'requirements',
  'responsibilities',
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

// Built once at module load: one alternation regex instead of N `.includes()`
// scans. Phrases containing spaces or accented characters still work fine
// inside \b...\b since \b only needs a word-boundary at each end of the match.
const JOB_KEYWORD_PATTERN = new RegExp(
  `\\b(${JOB_KEYWORDS.map((kw) => kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
  'i',
);

export interface JobContentValidationResult {
  isJobContent: boolean;
  reason: string;
}

export const NON_JOB_CONTENT_MESSAGE =
  'This does not appear to be a job posting, offer, or recruitment message. Please enter a job description, recruitment message, or offer letter to analyze.';

/**
 * Intent-based, not completeness-based: this checks whether the text
 * signals employment/recruitment intent at all, not whether it reads like a
 * complete, well-formed job ad, and it never judges whether the job itself
 * is legitimate (that is the rule engine's job, unchanged, downstream of
 * this gate). A single recognized term from any one of the four categories
 * above — a job role, a hiring signal, an application signal, or an
 * employment-context term — is enough to pass. False negatives here (non-
 * job text that happens to mention one of these words) just fall through to
 * the unchanged rule engine, same as before this layer existed — the harm
 * of a false positive (rejecting a real job posting) is worse than the harm
 * of an occasional pass-through.
 */
export function validateJobContent(rawText: string): JobContentValidationResult {
  const isJobContent = JOB_KEYWORD_PATTERN.test(rawText);
  return {
    isJobContent,
    reason: isJobContent ? '' : NON_JOB_CONTENT_MESSAGE,
  };
}
