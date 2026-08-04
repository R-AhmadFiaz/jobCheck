import { Types } from 'mongoose';
import type { IRedFlag } from '@/modules/analysis/analysis.model';
import type { AIProviderAnalysisResult } from '@/modules/analysis/ai/interfaces/IAIProvider';

// Safety limits (Phase 7 — hybrid AI integration): these three constants are
// what make "AI can add supporting red flags but can never override the
// deterministic score" an enforced guarantee rather than a hope.
//
// AI_FLAG_WEIGHT is deliberately lower than every deterministic rule's
// weight (10-35) — a single AI-detected flag is always a supporting signal,
// never a headline one. MAX_AI_FLAGS_MERGED * AI_FLAG_WEIGHT is the hard
// ceiling on how much total weight AI can ever contribute to one analysis,
// regardless of how many red flags a provider claims to have found — a
// hallucinating or misbehaving model reporting 50 "red flags" still only
// ever adds at most this many points.
const AI_FLAG_WEIGHT = 4;
const MAX_AI_FLAGS_MERGED = 5; // → hard cap of 5 * 4 = 20 additional weight
// Below this, the AI's own read of the text isn't trusted enough to surface
// at all — neither its flags nor its explanation. Mirrors the same
// "ambiguous calls shouldn't act" philosophy already used for Gemini's
// REJECTION_CONFIDENCE_THRESHOLD, just applied to inclusion instead of
// rejection.
const MIN_AI_CONFIDENCE_TO_USE = 0.5;

export interface AIMergeInput {
  redFlags: IRedFlag[];
  totalWeight: number;
}

export interface AIMergeResult {
  redFlags: IRedFlag[];
  totalWeight: number;
  aiExplanation: string | null;
  aiConfidence: number | null;
}

function buildAIRedFlag(flagText: string, index: number): IRedFlag {
  // Same "<desc> | Category: | Evidence: | Recommendation:" convention
  // ruleEngine.ts/correlationEngine.ts already use, so the existing
  // frontend parser (parseRedFlag.ts) displays an AI-detected flag
  // identically to a rule/correlation flag with zero frontend changes.
  return {
    // Not a real ScamRule document — same soft-reference pattern already
    // established for correlation flags (see correlationEngine.ts):
    // redFlags.ruleId is never populate()'d anywhere in the codebase.
    ruleId: new Types.ObjectId(),
    label: `AI_DETECTED_SIGNAL_${index + 1}`,
    description: `${flagText} | Category: ai_insight | Evidence: Identified by AI analysis, not a deterministic rule match | Recommendation: Treat this as a supporting signal alongside the findings above — use your own judgment as well.`,
    weight: AI_FLAG_WEIGHT,
    severity: 'low',
  };
}

// Defense in depth (production-hardening phase): groq.provider.ts already
// validates every element is a string before this function ever sees it,
// but this merger must stay safe on its own terms too — it's the one place
// every current and future IAIProvider implementation's output passes
// through, and "malformed AI results never reach the merger" (per this
// phase's brief) is a guarantee this function should hold regardless of how
// disciplined any one provider's own validation happens to be.
function sanitizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

function formatAIExplanation(result: AIProviderAnalysisResult): string {
  const summary = typeof result.summary === 'string' ? result.summary.trim() : '';
  const recommendations = sanitizeStringList(result.recommendations);
  const sections = [summary];
  if (recommendations.length) {
    sections.push(`Recommendations:\n${recommendations.map((r) => `- ${r}`).join('\n')}`);
  }
  return sections.join('\n\n');
}

/**
 * Pure, deterministic merge of an (optional) AI provider result into the
 * existing rule-engine + correlation-layer output. Called from
 * analysis.service.ts strictly AFTER evaluateDeterministic() has already
 * run — this function never talks to the rule engine, the database, or any
 * AI provider itself; it only combines data it's handed.
 *
 * Additive only: the base redFlags/totalWeight are never removed or
 * mutated, only appended to. If `aiResult` is null (AI disabled, not
 * configured, or failed) or the AI itself wasn't confident this is even a
 * job posting, this is a no-op that returns `base` untouched plus null
 * explanation fields — the exact same shape the pipeline already produced
 * before this phase existed.
 */
export function mergeAIFindings(
  base: AIMergeInput,
  aiResult: AIProviderAnalysisResult | null,
): AIMergeResult {
  const hasUsableConfidence =
    !!aiResult && typeof aiResult.confidence === 'number' && Number.isFinite(aiResult.confidence);

  if (!aiResult || !aiResult.isJobPosting || !hasUsableConfidence || aiResult.confidence < MIN_AI_CONFIDENCE_TO_USE) {
    return {
      redFlags: base.redFlags,
      totalWeight: base.totalWeight,
      aiExplanation: null,
      aiConfidence: null,
    };
  }

  const flagTexts = sanitizeStringList(aiResult.redFlags)
    .map((text) => text.trim())
    .filter((text) => text.length > 0)
    .slice(0, MAX_AI_FLAGS_MERGED);
  const aiFlags = flagTexts.map((text, index) => buildAIRedFlag(text, index));
  const additionalWeight = aiFlags.length * AI_FLAG_WEIGHT;

  return {
    redFlags: [...base.redFlags, ...aiFlags],
    totalWeight: base.totalWeight + additionalWeight,
    aiExplanation: formatAIExplanation(aiResult),
    aiConfidence: aiResult.confidence,
  };
}
