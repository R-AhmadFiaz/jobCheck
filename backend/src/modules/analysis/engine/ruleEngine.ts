import type { Types } from 'mongoose';
import { ScamRule, type IScamRule } from '@/modules/analysis/engine/scamRule.model';
import type { IExtractedFields, IRedFlag } from '@/modules/analysis/analysis.model';

export const ENGINE_VERSION = 'rule-engine-v1';

interface BaseMatcherConfig {
  recommendation: string;
}

interface KeywordMatcherConfig extends BaseMatcherConfig {
  type: 'keyword';
  keywords: string[];
  // Optional, backward-compatible: rules that omit these behave exactly as
  // before. weakKeywords are ambiguous single terms (e.g. "fee") that only
  // count once reinforced — by a strong `keywords` hit, another weak hit, or
  // a contextKeywords hit — so a bare mention never triggers alone.
  // contextKeywords never cause a match by themselves; they only strengthen
  // the internal confidence of an already-matched rule (see
  // computeMatchConfidence below).
  weakKeywords?: string[];
  contextKeywords?: string[];
}

interface RegexMatcherConfig extends BaseMatcherConfig {
  type: 'regex';
  pattern: string;
  flags?: string;
}

interface EmailDomainMatcherConfig extends BaseMatcherConfig {
  type: 'emailDomain';
  genericDomains: string[];
}

interface FieldPresenceMatcherConfig extends BaseMatcherConfig {
  type: 'fieldPresence';
  requiredField: keyof IExtractedFields;
}

type MatcherConfig =
  KeywordMatcherConfig | RegexMatcherConfig | EmailDomainMatcherConfig | FieldPresenceMatcherConfig;

/**
 * `ScamRule.matcher` is intentionally `Mixed` (§5) so admins can define new
 * matcher shapes as data without a redeploy. This is the one trusted boundary
 * where that untyped, admin-authored data is treated as a known shape.
 */
function asMatcherConfig(matcher: unknown): MatcherConfig {
  return matcher as MatcherConfig;
}

interface MatchOutcome {
  matched: boolean;
  evidence: string;
  // 0..1, internal only — not persisted on IRedFlag and not part of any API
  // response yet (see analysis.service.ts's dev-only debug log). Reserved
  // for future use once the API/DB are intentionally extended to expose it.
  // Non-keyword matchers are inherently binary/certain, so they report 1.
  confidence: number;
}

const NO_MATCH: MatchOutcome = { matched: false, evidence: '', confidence: 0 };

function findMatches(text: string, terms: string[]): string[] {
  return terms.filter((term) => text.includes(term.toLowerCase()));
}

// Deterministic confidence estimate from three ingredients: how many strong
// (primary) phrases matched, how many weak phrases matched, and how many
// contextual booster terms were present alongside them. Strong evidence
// counts for more than weak evidence; context alone contributes the least.
// Purely additive — never fed back into totalWeight/riskScore.
function computeMatchConfidence(strongCount: number, weakCount: number, contextCount: number): number {
  const raw = strongCount * 0.5 + weakCount * 0.2 + contextCount * 0.1;
  return Math.min(1, Math.round(raw * 100) / 100);
}

function matchKeyword(text: string, config: KeywordMatcherConfig): MatchOutcome {
  const strongMatches = findMatches(text, config.keywords);
  const contextMatches = config.contextKeywords ? findMatches(text, config.contextKeywords) : [];

  // Drop weak matches that are trivially substrings of an already-matched
  // strong phrase (e.g. "fee" inside an already-counted "registration fee")
  // so the same occurrence isn't reported as separate evidence.
  const weakMatchesRaw = config.weakKeywords ? findMatches(text, config.weakKeywords) : [];
  const weakMatches = weakMatchesRaw.filter(
    (weak) => !strongMatches.some((strong) => strong.includes(weak)),
  );

  // A lone weak keyword with nothing reinforcing it is exactly the "'fee'
  // alone should not always trigger" case — it only counts once paired with
  // a strong phrase, another weak match, or a contextual booster term.
  const weakReinforced =
    weakMatches.length > 0 &&
    (strongMatches.length > 0 || weakMatches.length > 1 || contextMatches.length > 0);

  if (strongMatches.length === 0 && !weakReinforced) return NO_MATCH;

  const evidencePhrases = weakReinforced ? [...strongMatches, ...weakMatches] : strongMatches;
  const confidence = computeMatchConfidence(
    strongMatches.length,
    weakReinforced ? weakMatches.length : 0,
    contextMatches.length,
  );

  return {
    matched: true,
    evidence: evidencePhrases.map((phrase) => `matched phrase "${phrase}"`).join('; '),
    confidence,
  };
}

function matchRegex(text: string, config: RegexMatcherConfig): MatchOutcome {
  const regex = new RegExp(config.pattern, config.flags ?? 'i');
  const result = regex.exec(text);
  return result
    ? { matched: true, evidence: `matched pattern "${result[0]}"`, confidence: 1 }
    : NO_MATCH;
}

function matchEmailDomain(
  extractedFields: IExtractedFields,
  config: EmailDomainMatcherConfig,
): MatchOutcome {
  const email = extractedFields.contactEmail;
  if (!email) return NO_MATCH;

  const domain = email.split('@')[1]?.toLowerCase();
  if (domain && config.genericDomains.includes(domain)) {
    return {
      matched: true,
      evidence: `contact email uses generic domain "${domain}"`,
      confidence: 1,
    };
  }
  return NO_MATCH;
}

function matchFieldPresence(
  extractedFields: IExtractedFields,
  config: FieldPresenceMatcherConfig,
): MatchOutcome {
  const value = extractedFields[config.requiredField];
  return value
    ? NO_MATCH
    : {
        matched: true,
        evidence: `no ${config.requiredField} could be identified in the posting`,
        confidence: 1,
      };
}

function evaluateMatcher(
  matcher: MatcherConfig,
  normalizedText: string,
  extractedFields: IExtractedFields,
): MatchOutcome {
  switch (matcher.type) {
    case 'keyword':
      return matchKeyword(normalizedText, matcher);
    case 'regex':
      return matchRegex(normalizedText, matcher);
    case 'emailDomain':
      return matchEmailDomain(extractedFields, matcher);
    case 'fieldPresence':
      return matchFieldPresence(extractedFields, matcher);
    default:
      return NO_MATCH;
  }
}

function composeDescription(rule: IScamRule, evidence: string, recommendation: string): string {
  return `${rule.description} | Category: ${rule.category} | Evidence: ${evidence} | Recommendation: ${recommendation}`;
}

export interface RuleEvaluationResult {
  redFlags: IRedFlag[];
  totalWeight: number;
  // Per-flag confidence (keyed by rule.key, same value as the flag's
  // `label`), 0..1 — internal only, not persisted and not part of any API
  // response yet. Never influences totalWeight/riskScore; see
  // computeMatchConfidence's doc comment. Callers may ignore this entirely.
  ruleConfidence: Record<string, number>;
}

export async function evaluateActiveRules(
  normalizedText: string,
  extractedFields: IExtractedFields,
): Promise<RuleEvaluationResult> {
  const activeRules = await ScamRule.find({ isActive: true });

  const redFlags: IRedFlag[] = [];
  const ruleConfidence: Record<string, number> = {};
  let totalWeight = 0;

  for (const rule of activeRules) {
    const matcher = asMatcherConfig(rule.matcher);
    const outcome = evaluateMatcher(matcher, normalizedText, extractedFields);

    if (outcome.matched) {
      redFlags.push({
        ruleId: rule._id as Types.ObjectId,
        label: rule.key,
        description: composeDescription(rule, outcome.evidence, matcher.recommendation),
        weight: rule.weight,
        severity: rule.severity,
      });
      totalWeight += rule.weight;
      ruleConfidence[rule.key] = outcome.confidence;
    }
  }

  return { redFlags, totalWeight, ruleConfidence };
}
