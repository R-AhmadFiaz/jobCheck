import type { IExtractedFields } from '@/modules/analysis/analysis.model';

export interface NormalizedJobPosting {
  normalizedText: string;
  extractedFields: IExtractedFields;
}

const URL_PATTERN = /^https?:\/\/\S+$/i;
const EMAIL_PATTERN = /[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}/;

// A single capitalized "word" a company name can be built from: letters,
// digits, &, ' (straight or curly), - , plus an optional trailing
// `.something` segment for domain-style names/abbreviations (PakWheels.com,
// Inc.). The dot is deliberately NOT a bare allowed character (unlike the
// pre-fix version) — it only matches as part of `\.[A-Za-z0-9]+`, i.e. only
// when followed by more alphanumerics. Two bugs in the original pattern
// depended on exactly this distinction:
//  1. A bare trailing dot (an ordinary sentence-ending period, e.g. "About
//     PakWheels.") would otherwise get greedily swallowed into the token
//     ("PakWheels."), since `.` was an unconditionally allowed character.
//  2. Comma was allowed in the same class, so "At PakWheels, we..." could
//     capture "PakWheels," (comma included) instead of "PakWheels" — comma
//     is excluded entirely now; it's always a clause separator, never part
//     of a real company name.
const NAME_TOKEN = `[A-Z][\\w&'’-]*(?:\\.[A-Za-z0-9]+)*`;
// Multi-word names ("Example AI Labs") are joined by plain horizontal
// whitespace only — deliberately NOT `\s`, which also matches newlines.
// Job postings routinely have a capitalized word starting the very next
// sentence or heading right after a company mention ("About PakWheels\n\nWe
// are hiring..."); matching across that line break would otherwise merge
// the unrelated next word ("We") straight into the captured name.
const NAME_PHRASE = `${NAME_TOKEN}(?:[ \\t]+${NAME_TOKEN}){0,4}`;

// Capitalized words that are never themselves a company name, even though
// they're routinely capitalized in job-posting prose immediately after one
// of the anchor words below ("About Us", "About This Role", "Join Our
// Team", "About The Job"). Checked against the first captured word only.
const COMPANY_NAME_STOPWORDS = new Set([
  'us',
  'our',
  'the',
  'this',
  'that',
  'we',
  'you',
  'job',
  'role',
  'position',
  'team',
  'company',
  'companies',
  'about',
  'overview',
  'summary',
]);

// Ordered from most to least specific/reliable. Anchor words are spelled out
// in both cases (`[Aa]t`, `[Cc]ompany`, ...) rather than using the `/i` flag,
// because `/i` would also make the `[A-Z]` inside NAME_TOKEN case-insensitive
// — defeating the "must actually be capitalized" signal that's the main
// defense against grabbing an arbitrary word as a company (§5). The first
// pattern to produce a candidate whose first word isn't a stopword wins.
const COMPANY_NAME_PATTERNS: RegExp[] = [
  // "Company: X", "About the company: X"
  new RegExp(`\\b[Cc]ompany\\s*:\\s*(${NAME_PHRASE})`),
  // "At X, we..." / "At X we..." — the exact construction from the
  // PakWheels posting ("At PakWheels, we take pride..."). Requires "we"
  // shortly after so ordinary prepositional "at <place/time>" phrases
  // (e.g. "At Lahore, Punjab, Pakistan") don't match.
  new RegExp(`\\b[Aa]t\\s+(${NAME_PHRASE})\\s*,?\\s+[Ww]e\\b`),
  // "This role at X"
  new RegExp(`\\b[Tt]his\\s+[Rr]ole\\s+[Aa]t\\s+(${NAME_PHRASE})`),
  // "We are hiring at X" / "hiring at X"
  new RegExp(`\\b[Hh]iring\\s+[Aa]t\\s+(${NAME_PHRASE})`),
  // "X is hiring"
  new RegExp(`\\b(${NAME_PHRASE})\\s+[Ii]s\\s+[Hh]iring\\b`),
  // "Join X" / "Join the X team"
  new RegExp(`\\b[Jj]oin\\s+(?:[Tt]he\\s+)?(${NAME_PHRASE})(?:\\s+[Tt]eam)?\\b`),
  // "About X" — kept last: the weakest signal (no colon, no other anchor),
  // and the one most likely to catch a heading like "About Us"/"About This
  // Role" instead of a real name, hence relying on the stopword filter.
  new RegExp(`\\b[Aa]bout\\s+(${NAME_PHRASE})`),
  // Last resort: a bare "Company.com"-style domain mention with no other
  // signal anywhere in the text (e.g. "...PakWheels.com has transformed...").
  /\b([A-Z][\w-]*\.(?:com|io|ai|co))\b/,
];

function firstWordIsStopword(candidate: string): boolean {
  const firstWord = candidate.split(/\s+/)[0]?.toLowerCase().replace(/[.,;:'’-]+$/, '');
  return firstWord ? COMPANY_NAME_STOPWORDS.has(firstWord) : true;
}

/**
 * Runs every candidate pattern (most to least specific) against the original
 * (mixed-case) posting text and returns the first plausible company name, or
 * null if nothing matched. Deliberately independent of the AI layer (§8) —
 * this runs during Stage 1 normalization, before any AI provider is called.
 */
function extractCompanyName(text: string): string | null {
  for (const pattern of COMPANY_NAME_PATTERNS) {
    const match = pattern.exec(text);
    const candidate = match?.[1]?.trim();
    if (!candidate) continue;
    if (firstWordIsStopword(candidate)) continue;
    return candidate.replace(/[.,;:'’-]+$/, '');
  }
  return null;
}

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

  // Company extraction runs against a version of the text that only
  // collapses horizontal whitespace, keeping line breaks intact — unlike
  // `cleaned` above (used for `normalizedText`/rule matching, unchanged),
  // where every run of whitespace including newlines becomes a single
  // space. NAME_PHRASE relies on that distinction to stop a multi-word
  // capture at the end of a line instead of continuing into whatever
  // capitalized word starts the next heading or sentence.
  const withPreservedLineBreaks = withoutHtml.replace(/[ \t]+/g, ' ').trim();
  extractedFields.companyName = extractCompanyName(withPreservedLineBreaks);

  return { normalizedText: cleaned.toLowerCase(), extractedFields };
}
