import { Types } from 'mongoose';
import type { IRedFlag } from '@/modules/analysis/analysis.model';

// Signal-correlation layer (Phase 6 of the rule engine's deterministic
// improvements). Runs strictly AFTER evaluateActiveRules() (ruleEngine.ts)
// and only ever consumes its output — the already-matched red flags — never
// rawText/normalizedText, and never the ScamRule collection. It is isolated
// on purpose: evaluateActiveRules() is completely unaware this layer exists,
// so normal rule evaluation keeps working exactly as it always has, with or
// without this file.
//
// Each correlation is a fixed, named combination of rule keys that — when
// ALL present together — represents a materially stronger, more specific
// scam narrative than any of its individual rules imply alone (see the
// per-correlation comments below for the reasoning). Matching is pure
// set-membership: deterministic, no heuristics, no AI, no external calls.
//
// Deliberately additive only: this layer can add extra weight and extra
// flags, but never removes, mutates, or reorders anything
// evaluateActiveRules() already produced.

export interface CorrelationDefinition {
  // Same naming convention as ScamRule.key (UPPER_SNAKE_CASE) so it reads
  // identically to a normal flag once humanized by the frontend.
  key: string;
  // All of these ScamRule keys must already be present in the matched red
  // flags for this correlation to fire. Always AND semantics — every
  // correlation below describes a combination, never an alternative.
  requiredKeys: string[];
  description: string;
  weight: number;
  severity: 'low' | 'medium' | 'high';
  recommendation: string;
}

const CORRELATIONS: CorrelationDefinition[] = [
  {
    // Example 1 from spec: an employer nobody can actually reach or verify.
    key: 'UNTRACEABLE_RECRUITER_PATTERN',
    requiredKeys: [
      'GENERIC_EMAIL_DOMAIN',
      'OFF_PLATFORM_MESSAGING_ONLY_RECRUITER',
      'MISSING_COMPANY_NAME',
    ],
    description:
      'A free personal email domain, messaging-app-only contact, and no identifiable company together mean this "employer" cannot be verified through any channel at all.',
    weight: 15,
    severity: 'medium',
    recommendation:
      'Do not proceed until you can verify the company through an independent source — a real company website, LinkedIn page, or business registry. Being unreachable by any traceable channel is a major warning sign on its own.',
  },
  {
    // Example 2 from spec: the classic "pay now, before you can think" funnel.
    key: 'PAYMENT_UNDER_PRESSURE_PATTERN',
    requiredKeys: ['UPFRONT_PAYMENT_REQUEST', 'URGENCY_PRESSURE_LANGUAGE'],
    description:
      'A request for upfront payment combined with pressure to act quickly is a classic scam funnel — urgency is used specifically to stop a candidate from pausing to verify the payment request.',
    weight: 15,
    severity: 'high',
    recommendation:
      'Slow down. Any legitimate job will still be available tomorrow. Never send payment because you were told you must decide "right now".',
  },
  {
    // Example 3 from spec: fake investment platform wearing a job-ad costume.
    key: 'CRYPTO_GUARANTEED_INCOME_PATTERN',
    requiredKeys: ['CRYPTO_INVESTMENT_DISGUISED_AS_JOB', 'UNREALISTIC_EARNINGS_CLAIM'],
    description:
      'A crypto "task" job combined with guaranteed or unrealistic income claims is the signature pattern of an investment scam disguised as employment, not a real job.',
    weight: 15,
    severity: 'high',
    recommendation:
      'No real job guarantees investment-style returns. Treat any "crypto job" that promises guaranteed earnings as an investment scam, not employment.',
  },
  {
    // Example 4 from spec: the two together amount to a full identity-theft
    // kit, not just two separate inconveniences — hence the largest bonus.
    key: 'FULL_IDENTITY_THEFT_KIT_PATTERN',
    requiredKeys: ['IDENTITY_DOCUMENT_HARVESTING', 'BANKING_OTP_HARVESTING'],
    description:
      'Requests for both identity documents (passport/national ID) and banking credentials or an OTP together give a scammer everything needed to steal a victim\'s identity and drain their bank account — far more dangerous than either request alone.',
    weight: 25,
    severity: 'high',
    recommendation:
      'Stop all contact immediately. Never send identity documents or banking credentials/OTPs to a recruiter under any circumstance — no legitimate employer needs both.',
  },
  {
    // Example 5 from spec: running both mule schemes together suggests an
    // operation actively laundering through whichever channel a victim has.
    key: 'DUAL_MULE_SCHEME_PATTERN',
    requiredKeys: ['MONEY_MULE_BANK_TRANSFER_JOB', 'PARCEL_RESHIPPING_MULE_JOB'],
    description:
      'A posting combining both a bank-transfer "job" and a package-reshipping "job" indicates the same laundering operation is willing to route money or goods through whichever the victim has available — a much clearer money-laundering signal than either alone.',
    weight: 15,
    severity: 'high',
    recommendation:
      'Do not provide your bank account or home address for either purpose. Both patterns carry real legal liability for money laundering, even without any personal financial loss.',
  },
  {
    // No screening AND rushed — the two urgency-category rules reinforce
    // each other into a much stronger "there is no real hiring process" signal.
    key: 'RUSHED_NO_VETTING_HIRE_PATTERN',
    requiredKeys: ['IMMEDIATE_HIRING_NO_INTERVIEW', 'URGENCY_PRESSURE_LANGUAGE'],
    description:
      'Claiming instant hiring with no interview, while also pressuring a fast decision, indicates there is no real hiring process at all — both are being used together to prevent any due diligence.',
    weight: 10,
    severity: 'medium',
    recommendation:
      'A real employer that skips interviews entirely and demands an immediate decision is not conducting real hiring. Take the time to verify the company regardless of any deadline given.',
  },
  {
    // An unidentifiable employer that also wants money is one of the most
    // dangerous, commonly-reported combinations.
    key: 'ANONYMOUS_EMPLOYER_PAYMENT_PATTERN',
    requiredKeys: ['MISSING_COMPANY_NAME', 'UPFRONT_PAYMENT_REQUEST'],
    description:
      'A posting that never names the hiring company while also asking for upfront payment means there is no way to know who is actually receiving the money.',
    weight: 18,
    severity: 'high',
    recommendation:
      'Never send money to a party you cannot independently identify. Confirm the legal company name and verify it exists before considering any payment.',
  },
  {
    // Social-engineering combo: urgency is the standard tactic used to get a
    // victim to share an OTP/credential before they stop to think.
    key: 'RUSHED_CREDENTIAL_HARVEST_PATTERN',
    requiredKeys: ['BANKING_OTP_HARVESTING', 'URGENCY_PRESSURE_LANGUAGE'],
    description:
      'A request for an OTP or banking credential combined with pressure to act immediately is a standard social-engineering tactic — urgency is used specifically to stop a victim from pausing to verify the request.',
    weight: 18,
    severity: 'high',
    recommendation:
      'Never share an OTP or banking credential no matter how urgent the request sounds — a real bank or employer will never create time pressure around this.',
  },
  {
    // MLM language alone can be a legitimate (if undesirable) business model;
    // paired with guaranteed-income claims it becomes a textbook pyramid pitch.
    key: 'PYRAMID_SCHEME_INCOME_PATTERN',
    requiredKeys: ['MLM_RECRUITMENT_CHAIN', 'UNREALISTIC_EARNINGS_CLAIM'],
    description:
      'Recruitment-chain language combined with guaranteed or unrealistic income claims is the textbook pitch structure of a pyramid scheme, not a sales or marketing job.',
    weight: 12,
    severity: 'medium',
    recommendation:
      'Be very cautious of any opportunity where guaranteed income depends on recruiting more people beneath you — this is how pyramid schemes are structured, regardless of what the role is called.',
  },
  {
    // Document harvesting is far more dangerous when the requester is only
    // reachable through an unverifiable personal messaging channel.
    key: 'UNTRACEABLE_DOCUMENT_REQUEST_PATTERN',
    requiredKeys: ['OFF_PLATFORM_MESSAGING_ONLY_RECRUITER', 'IDENTITY_DOCUMENT_HARVESTING'],
    description:
      'A request for identity documents from a recruiter reachable only through WhatsApp or Telegram means there is no verifiable, traceable party receiving sensitive personal documents.',
    weight: 18,
    severity: 'high',
    recommendation:
      'Never send identity documents to a contact reachable only through a personal messaging app. Legitimate employers collect documents through verifiable, traceable channels such as a company email domain or HR system.',
  },
];

function humanizeKey(key: string): string {
  return key
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Same "<desc> | Category: x | Evidence: y | Recommendation: z" convention
// ruleEngine.ts's composeDescription uses, so the existing frontend parser
// (parseRedFlag.ts) displays a correlation flag identically to a normal one
// with zero frontend changes — this is what keeps the explanation visible
// instead of hidden, per the "never hide why a score increased" requirement.
function composeCorrelationDescription(correlation: CorrelationDefinition): string {
  const evidence = correlation.requiredKeys.map(humanizeKey).join(' + ');
  return `${correlation.description} | Category: correlation | Evidence: ${evidence} | Recommendation: ${correlation.recommendation}`;
}

export interface CorrelationResult {
  correlationFlags: IRedFlag[];
  additionalWeight: number;
}

/**
 * Pure function: given the red flags evaluateActiveRules() already matched,
 * returns any additional correlation flags to append and the extra weight
 * they contribute. Never queries the database and never re-inspects the
 * original text — by design, so this layer stays reusable by anything that
 * already has a matched-flags list, including a future Gemini-aware caller
 * (per the brief: "future Gemini integration should be able to reuse this
 * layer").
 */
export function applyRuleCorrelations(matchedFlags: IRedFlag[]): CorrelationResult {
  const matchedKeys = new Set(matchedFlags.map((flag) => flag.label));
  const correlationFlags: IRedFlag[] = [];
  let additionalWeight = 0;

  for (const correlation of CORRELATIONS) {
    const allPresent = correlation.requiredKeys.every((key) => matchedKeys.has(key));
    if (!allPresent) continue;

    correlationFlags.push({
      // Not a real ScamRule document — there is nothing to reference, so a
      // fresh id is generated. Safe: redFlags.ruleId is a soft reference
      // (see analysis.model.ts) that is never populate()'d anywhere in the
      // codebase, only ever read back as an opaque id.
      ruleId: new Types.ObjectId(),
      label: correlation.key,
      description: composeCorrelationDescription(correlation),
      weight: correlation.weight,
      severity: correlation.severity,
    });
    additionalWeight += correlation.weight;
  }

  return { correlationFlags, additionalWeight };
}
