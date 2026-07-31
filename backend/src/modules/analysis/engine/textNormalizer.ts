import type { IExtractedFields } from '@/modules/analysis/analysis.model';

export interface NormalizedJobPosting {
  normalizedText: string;
  extractedFields: IExtractedFields;
}

const URL_PATTERN = /^https?:\/\/\S+$/i;
const EMAIL_PATTERN = /[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}/;

const COMPANY_NAME_PATTERNS = [
  /(?:^|\n)\s*company\s*:?\s*([A-Z][\w&.,'-]{1,60})/,
  /\bat\s+([A-Z][\w&.,'-]{1,60}(?:\s+[A-Z][\w&.,'-]{1,60}){0,3})(?=[\s,.\n]|$)/,
  /\b([A-Z][\w&.,'-]{1,60}(?:\s+[A-Z][\w&.,'-]{1,60}){0,3})\s+is\s+hiring\b/,
];

function emptyExtractedFields(): IExtractedFields {
  return {
    companyName: null,
    jobTitle: null,
    salaryRange: null,
    contactEmail: null,
    contactPhone: null,
    location: null,
  };
}

/**
 * Stage 1 (§8): produces `normalizedText`, a lowercased copy used for rule
 * matching, while `rawJobText` (untouched, set by the caller) remains the
 * original for display. Also heuristically extracts the fields this phase's
 * rules need. No scraping: a bare submitted URL has nothing to extract from yet.
 */
export function normalizeJobPosting(rawText: string): NormalizedJobPosting {
  const trimmed = rawText.trim();

  if (URL_PATTERN.test(trimmed)) {
    return { normalizedText: trimmed.toLowerCase(), extractedFields: emptyExtractedFields() };
  }

  const withoutHtml = trimmed.replace(/<[^>]*>/g, ' ');
  const cleaned = withoutHtml.replace(/\s+/g, ' ').trim();

  const extractedFields = emptyExtractedFields();

  const emailMatch = EMAIL_PATTERN.exec(cleaned);
  extractedFields.contactEmail = emailMatch ? emailMatch[0].toLowerCase() : null;

  for (const pattern of COMPANY_NAME_PATTERNS) {
    const match = pattern.exec(cleaned);
    if (match?.[1]) {
      extractedFields.companyName = match[1].trim();
      break;
    }
  }

  return { normalizedText: cleaned.toLowerCase(), extractedFields };
}
