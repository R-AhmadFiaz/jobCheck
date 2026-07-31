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
}

const NO_MATCH: MatchOutcome = { matched: false, evidence: '' };

function matchKeyword(text: string, config: KeywordMatcherConfig): MatchOutcome {
  const found = config.keywords.find((keyword) => text.includes(keyword.toLowerCase()));
  return found ? { matched: true, evidence: `matched phrase "${found}"` } : NO_MATCH;
}

function matchRegex(text: string, config: RegexMatcherConfig): MatchOutcome {
  const regex = new RegExp(config.pattern, config.flags ?? 'i');
  const result = regex.exec(text);
  return result ? { matched: true, evidence: `matched pattern "${result[0]}"` } : NO_MATCH;
}

function matchEmailDomain(
  extractedFields: IExtractedFields,
  config: EmailDomainMatcherConfig,
): MatchOutcome {
  const email = extractedFields.contactEmail;
  if (!email) return NO_MATCH;

  const domain = email.split('@')[1]?.toLowerCase();
  if (domain && config.genericDomains.includes(domain)) {
    return { matched: true, evidence: `contact email uses generic domain "${domain}"` };
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
    : { matched: true, evidence: `no ${config.requiredField} could be identified in the posting` };
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
}

export async function evaluateActiveRules(
  normalizedText: string,
  extractedFields: IExtractedFields,
): Promise<RuleEvaluationResult> {
  const activeRules = await ScamRule.find({ isActive: true });

  const redFlags: IRedFlag[] = [];
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
    }
  }

  return { redFlags, totalWeight };
}
