// Document classification (Phase 8 — architectural fix, not keyword hacks):
// the AI's FIRST responsibility, ahead of any scam-risk assessment. This
// module owns the fixed vocabulary of document types and the single
// decision of whether a classified document should even reach the
// deterministic rule engine — analysis.service.ts calls
// evaluateDocumentClassification() and acts on its verdict; it contains no
// classification logic of its own.

export type DocumentType =
  | 'JOB_POSTING'
  | 'INTERNSHIP_POSTING'
  | 'RESUME_CV'
  | 'COVER_LETTER'
  | 'PORTFOLIO'
  | 'ASSIGNMENT'
  | 'PROJECT_REPORT'
  | 'ACADEMIC_DOCUMENT'
  | 'COMPANY_PROFILE'
  | 'GENERAL_DOCUMENT'
  | 'UNKNOWN';

export const DOCUMENT_TYPES: readonly DocumentType[] = [
  'JOB_POSTING',
  'INTERNSHIP_POSTING',
  'RESUME_CV',
  'COVER_LETTER',
  'PORTFOLIO',
  'ASSIGNMENT',
  'PROJECT_REPORT',
  'ACADEMIC_DOCUMENT',
  'COMPANY_PROFILE',
  'GENERAL_DOCUMENT',
  'UNKNOWN',
];

// The only two types that represent an actual recruitment opportunity.
// Internship scams are real, so INTERNSHIP_POSTING gets the exact same
// pipeline as JOB_POSTING — never a lighter or skipped analysis.
export const EMPLOYMENT_DOCUMENT_TYPES: readonly DocumentType[] = ['JOB_POSTING', 'INTERNSHIP_POSTING'];

export function isEmploymentDocumentType(documentType: DocumentType): boolean {
  return EMPLOYMENT_DOCUMENT_TYPES.includes(documentType);
}

// Below this, the AI's classification of a document as non-employment
// isn't trusted enough to fully block analysis — mirrors the same
// "ambiguous calls shouldn't act" philosophy as Gemini's own
// REJECTION_CONFIDENCE_THRESHOLD, applied to a different decision. Blocking
// a real job posting because of a low-confidence misclassification is worse
// than occasionally letting a non-job document reach the rule engine (the
// pre-existing jobContentValidator gate is still running upstream of this
// either way).
const MIN_CLASSIFICATION_CONFIDENCE_TO_REJECT = 0.6;

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  JOB_POSTING: 'a job posting',
  INTERNSHIP_POSTING: 'an internship posting',
  RESUME_CV: 'a resume or CV',
  COVER_LETTER: 'a cover letter',
  PORTFOLIO: 'a portfolio',
  ASSIGNMENT: 'an academic assignment',
  PROJECT_REPORT: 'a project report',
  ACADEMIC_DOCUMENT: 'an academic document',
  COMPANY_PROFILE: 'a company profile',
  GENERAL_DOCUMENT: 'a general document',
  UNKNOWN: 'an unrecognized document',
};

export interface DocumentClassificationDecision {
  shouldReject: boolean;
  // Non-null exactly when shouldReject is true.
  message: string | null;
}

/**
 * The one gating decision this module exists for: given the AI's
 * classification, should the deterministic rule engine / correlation layer
 * / scoring run at all? Pure function — no AI call, no DB, so every branch
 * is directly unit-testable.
 */
export function evaluateDocumentClassification(
  documentType: DocumentType,
  documentTypeConfidence: number,
): DocumentClassificationDecision {
  if (isEmploymentDocumentType(documentType)) {
    return { shouldReject: false, message: null };
  }

  if (documentTypeConfidence < MIN_CLASSIFICATION_CONFIDENCE_TO_REJECT) {
    return { shouldReject: false, message: null };
  }

  return {
    shouldReject: true,
    message: `This document appears to be ${DOCUMENT_TYPE_LABELS[documentType]} rather than a recruitment posting. JobCheck currently analyzes recruitment advertisements and internship postings.`,
  };
}
