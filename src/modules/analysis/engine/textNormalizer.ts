import type { IExtractedFields } from '@/modules/analysis/analysis.model';

export interface NormalizedJobPosting {
  normalizedText: string;
  extractedFields: IExtractedFields;
}

const URL_PATTERN = /^https?:\/\/\S+$/i;
const EMAIL_PATTERN = /[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}/;

// A single capitalized "word" a company name can be built from: letters,
// digits, &, ' (straight or curly), - , ® ™ © (trademark/copyright marks —
// "At BairesDev®, we've..." would otherwise fail to extract, since the mark
// sits directly between the name and the following comma with no space),
// plus an optional trailing `.something` segment for domain-style names/
// abbreviations (PakWheels.com, Inc.). The dot is deliberately NOT a bare
// allowed character (unlike the pre-fix version) — it only matches as part
// of `\.[A-Za-z0-9]+`, i.e. only when followed by more alphanumerics. Two
// bugs in the original pattern depended on exactly this distinction:
//  1. A bare trailing dot (an ordinary sentence-ending period, e.g. "About
//     PakWheels.") would otherwise get greedily swallowed into the token
//     ("PakWheels."), since `.` was an unconditionally allowed character.
//  2. Comma was allowed in the same class, so "At PakWheels, we..." could
//     capture "PakWheels," (comma included) instead of "PakWheels" — comma
//     is excluded entirely now; it's always a clause separator, never part
//     of a real company name.
const NAME_TOKEN = `[A-Z][\\w&'’®™©-]*(?:\\.[A-Za-z0-9]+)*`;
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
  const firstWord = candidate.split(/\s+/)[0]?.toLowerCase().replace(/[.,;:'’®™©-]+$/, '');
  return firstWord ? COMPANY_NAME_STOPWORDS.has(firstWord) : true;
}

// A heading that ends the "header block" (§ below) — the stacked
// company/title/location/work-mode lines LinkedIn-style and plain-text
// postings both put before the prose actually starts. Job title/location
// extraction is deliberately scoped to lines *before* the first of these,
// so it can never wander into a "Requirements"/"Responsibilities" paragraph
// and grab an unrelated capitalized phrase from the body.
const SECTION_HEADING_LINE =
  /^(about\s+(the\s+)?(job|role|position|company|us)|what\s+you.?ll\s+do|what\s+you\s+will\s+do|what\s+we\s+are\s+looking\s+for|responsibilities|requirements|qualifications|the\s+role|job\s+description|overview|summary)\s*:?\s*$/i;

// "About the company" (exact heading line) followed by the name on its own
// next line — the exact BairesDev-report shape ("About the company\n\nBairesDev\n...").
// Deliberately NOT "About Us", which is almost always followed by a
// sentence ("We are a growing team...") rather than a bare name.
const ABOUT_COMPANY_HEADING = /^about\s+the\s+company\s*:?\s*$/i;

// Job-role vocabulary — used only to keep the "first line is the company"
// and "this line is the location" heuristics below from misfiring on a
// title line. Company names essentially never contain these words; job
// titles very often do.
const TITLE_HINT_PATTERN =
  /\b(?:engineer|developer|manager|analyst|designer|specialist|coordinator|director|architect|consultant|administrator|assistant|officer|executive|lead|intern|representative|technician|scientist|recruiter|accountant|associate|supervisor|strategist|producer|planner|programmer)\b/i;

const EMPLOYMENT_METADATA_WORDS = new Set([
  'remote',
  'hybrid',
  'onsite',
  'on-site',
  'in-office',
  'full-time',
  'part-time',
  'contract',
  'contractor',
  'internship',
  'temporary',
  'freelance',
]);

// A line matching this pattern (e.g. "Lahore, Punjab, Pakistan", "Austin, TX")
// is checked against EMPLOYMENT_METADATA_WORDS first — "Full-time, Remote"
// would otherwise also match this shape.
const LOCATION_LINE =
  /^[A-Z][A-Za-z.'-]*(?:\s+[A-Z][A-Za-z.'-]*){0,3},\s*[A-Z][A-Za-z.'-]*(?:\s+[A-Z][A-Za-z.'-]*){0,3}(?:,\s*[A-Z][A-Za-z.'-]*(?:\s+[A-Z][A-Za-z.'-]*){0,3})?$/;

function isMetadataOnlyLine(line: string): boolean {
  const segments = line.split(',').map((s) => s.trim().toLowerCase());
  return segments.every((s) => EMPLOYMENT_METADATA_WORDS.has(s));
}

// Explicit "Label: value" fields — the most reliable signal when present,
// checked against the whole text before falling back to structural
// (line-position) heuristics.
const JOB_TITLE_LABEL = /\b(?:job\s*title|position\s*title|position|role)\s*:\s*([^\n|]{2,100})/i;
const LOCATION_LABEL = /\blocation\s*:\s*([^\n]{2,100})/i;

function extractLabeledField(text: string, pattern: RegExp): string | null {
  const candidate = pattern.exec(text)?.[1]?.trim();
  return candidate ? candidate.replace(/\s*\|.*$/, '').trim() || null : null;
}

/**
 * Runs every candidate pattern (most to least specific) against the original
 * (mixed-case) posting text and returns the first plausible company name, or
 * null if nothing matched. Deliberately independent of the AI layer (§8) —
 * this runs during Stage 1 normalization, before any AI provider is called.
 */
function extractCompanyNameFromAnchors(text: string): string | null {
  for (const pattern of COMPANY_NAME_PATTERNS) {
    const match = pattern.exec(text);
    const candidate = match?.[1]?.trim();
    if (!candidate) continue;
    if (firstWordIsStopword(candidate)) continue;
    return candidate.replace(/[.,;:'’®™©-]+$/, '');
  }
  return null;
}

// Fallback for when the name appears with no anchor phrase at all — a bare
// heading line, exactly the shape "About the company\n\nBairesDev" puts it
// in. Requires the *entire* next line to be just a name-shaped phrase, so a
// heading immediately followed by ordinary prose can't match.
function extractCompanyNameFromAboutSection(lines: readonly string[]): string | null {
  const headingIndex = lines.findIndex((line) => ABOUT_COMPANY_HEADING.test(line));
  if (headingIndex === -1 || headingIndex + 1 >= lines.length) return null;

  const candidate = new RegExp(`^(${NAME_PHRASE})$`).exec(lines[headingIndex + 1])?.[1]?.trim();
  if (!candidate || firstWordIsStopword(candidate)) return null;
  return candidate.replace(/[.,;:'’®™©-]+$/, '');
}

// Fallback for the LinkedIn-style export shape: company name alone on the
// very first line, with no anchor word anywhere near it (the BairesDev
// report's top-of-posting line). Guarded tightly since this is the
// weakest signal of all: only the first line, only when it's short, only
// when there's more structure after it (lines.length >= 2, i.e. this isn't
// one giant paragraph), and never when it looks like a job title, a
// location, or pure work-mode/employment-type metadata.
function extractCompanyNameFromFirstLine(lines: readonly string[]): string | null {
  if (lines.length < 2) return null;
  const first = lines[0];
  if (!first || TITLE_HINT_PATTERN.test(first) || LOCATION_LINE.test(first) || isMetadataOnlyLine(first)) {
    return null;
  }

  const candidate = new RegExp(`^(${NAME_PHRASE})$`).exec(first)?.[1]?.trim();
  if (!candidate || firstWordIsStopword(candidate)) return null;
  return candidate.replace(/[.,;:'’®™©-]+$/, '');
}

function extractCompanyName(text: string, lines: readonly string[]): string | null {
  return (
    extractCompanyNameFromAnchors(text) ??
    extractCompanyNameFromAboutSection(lines) ??
    extractCompanyNameFromFirstLine(lines)
  );
}

// The lines before the first real section heading — the stacked
// company/title/location/work-mode block. Capped defensively in case a
// posting has no recognizable heading at all.
function getHeaderLines(lines: readonly string[]): string[] {
  const headingIndex = lines.findIndex((line) => SECTION_HEADING_LINE.test(line));
  const end = headingIndex === -1 ? Math.min(lines.length, 8) : Math.min(headingIndex, 8);
  return lines.slice(0, end);
}

const PROSE_STARTER_WORDS = new Set(['we', 'our', 'this', 'the', 'you', 'they', 'it', 'if', 'please', 'looking', 'seeking', 'i']);

// Distinguishes a real header line ("Java Software Engineer - Remote Work")
// from a stray sentence of body prose that happens to land in the header
// block on a single-paragraph submission — so Case 3 (no identifiable
// title) doesn't get a hallucinated "title" from the first sentence.
function looksLikeProse(line: string): boolean {
  if (line.length > 100) return true;
  const sentenceEnders = line.match(/[.!?](?:\s|$)/g)?.length ?? 0;
  if (sentenceEnders >= 2) return true;
  const firstWord = line.split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, '');
  return firstWord ? PROSE_STARTER_WORDS.has(firstWord) : false;
}

// Strips the metadata LinkedIn/ATS exports commonly tack onto the title
// line itself: "Java Software Engineer - Remote Work | REF#297056" -> "Java
// Software Engineer".
function cleanJobTitleLine(line: string): string {
  return line
    .replace(/\s*\|.*$/, '')
    .replace(/\s*[-–—]\s*(remote(?:\s+work)?|hybrid|on-?site|in-?office)\s*$/i, '')
    .trim();
}

function extractTitleAndLocationFromHeader(
  headerLines: readonly string[],
  companyLineIndex: number | null,
): { jobTitle: string | null; location: string | null } {
  let jobTitle: string | null = null;
  let location: string | null = null;

  for (let i = 0; i < headerLines.length; i++) {
    if (i === companyLineIndex) continue;
    const line = headerLines[i];
    if (!line || isMetadataOnlyLine(line)) continue;

    if (!location && LOCATION_LINE.test(line) && !TITLE_HINT_PATTERN.test(line)) {
      location = line;
      continue;
    }

    if (!jobTitle && !looksLikeProse(line)) {
      const cleaned = cleanJobTitleLine(line);
      if (cleaned.length >= 2 && cleaned.length <= 120) {
        jobTitle = cleaned;
      }
    }
  }

  return { jobTitle, location };
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

  // Company/title/location extraction all run against a version of the text
  // that only collapses horizontal whitespace, keeping line breaks intact —
  // unlike `cleaned` above (used for `normalizedText`/rule matching,
  // unchanged), where every run of whitespace including newlines becomes a
  // single space. NAME_PHRASE and the header-line heuristics below rely on
  // that distinction to stop at the end of a line instead of continuing
  // into whatever capitalized word starts the next heading or sentence.
  const withPreservedLineBreaks = withoutHtml.replace(/[ \t]+/g, ' ').trim();
  const lines = withPreservedLineBreaks.split('\n').map((line) => line.trim()).filter(Boolean);

  extractedFields.companyName = extractCompanyName(withPreservedLineBreaks, lines);

  const headerLines = getHeaderLines(lines);
  const companyLineIndex =
    extractedFields.companyName && headerLines[0]?.startsWith(extractedFields.companyName)
      ? 0
      : null;

  const structural = extractTitleAndLocationFromHeader(headerLines, companyLineIndex);
  extractedFields.jobTitle =
    extractLabeledField(withPreservedLineBreaks, JOB_TITLE_LABEL) ?? structural.jobTitle;
  extractedFields.location =
    extractLabeledField(withPreservedLineBreaks, LOCATION_LABEL) ?? structural.location;

  return { normalizedText: cleaned.toLowerCase(), extractedFields };
}
