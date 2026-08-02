// The rule engine (backend Phase 4) composes category/evidence/recommendation
// into RedFlag.description as "<desc> | Category: x | Evidence: y | Recommendation: z"
// since the persisted schema has no separate fields for them. This recovers
// each part for display.
export interface ParsedRedFlag {
  summary: string;
  category: string | null;
  evidence: string | null;
  recommendation: string | null;
}

export function parseRedFlagDescription(description: string): ParsedRedFlag {
  const parts = description.split(' | ');
  const summary = parts[0] ?? description;

  const extract = (prefix: string): string | null => {
    const match = parts.find((part) => part.startsWith(prefix));
    return match ? match.slice(prefix.length).trim() : null;
  };

  return {
    summary,
    category: extract('Category:'),
    evidence: extract('Evidence:'),
    recommendation: extract('Recommendation:'),
  };
}
