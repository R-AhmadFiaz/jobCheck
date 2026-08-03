import { Types } from 'mongoose';
import type { IExtractedFields, IJobAnalysis, IRedFlag } from '@/modules/analysis/analysis.model';
import * as analysisRepository from '@/modules/analysis/analysis.repository';
import type { CreateAnalysisInput } from '@/modules/analysis/analysis.validation';
import type { AccessTokenPayload } from '@/shared/utils/jwt';
import { ApiError } from '@/shared/utils/ApiError';
import { normalizeJobPosting } from '@/modules/analysis/engine/textNormalizer';
import { validateJobContent } from '@/modules/analysis/engine/jobContentValidator';
import { evaluateActiveRules, ENGINE_VERSION } from '@/modules/analysis/engine/ruleEngine';
import { applyRuleCorrelations } from '@/modules/analysis/engine/correlationEngine';
import { computeRiskScore, computeRiskLevel } from '@/modules/analysis/engine/scoring';
import type { RiskLevel } from '@/shared/types/riskLevel';
import { env } from '@/config/env';
import { logger } from '@/shared/utils/logger';
import {
  isGeminiConfigured,
  validateJobPostingContent,
  shouldRejectAsNonJobContent,
  generateExplanation,
  formatExplanationForStorage,
} from '@/modules/analysis/engine/ai/gemini.service';
import { getAIProvider } from '@/modules/analysis/ai/aiProviderFactory';
import { AIProviderError } from '@/modules/analysis/ai/interfaces/IAIProvider';
import type { AIProviderAnalysisResult } from '@/modules/analysis/ai/interfaces/IAIProvider';
import { mergeAIFindings } from '@/modules/analysis/ai/aiResultMerger';
import { evaluateDocumentClassification } from '@/modules/analysis/ai/documentClassification';

// Sentinel a record would carry if it were ever persisted before evaluation.
// Kept only so `deriveStatus` stays meaningful for any such record; every
// analysis created from this phase onward is evaluated synchronously below.
const PENDING_ENGINE_VERSION = 'pending';

export type AnalysisStatus = 'pending' | 'evaluated';

export interface AnalysisWithStatus {
  analysis: IJobAnalysis;
  status: AnalysisStatus;
}

export interface AnalysisHistoryResult {
  items: AnalysisWithStatus[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

function deriveStatus(analysis: IJobAnalysis): AnalysisStatus {
  return analysis.engineVersion === PENDING_ENGINE_VERSION ? 'pending' : 'evaluated';
}

interface EvaluatedPosting {
  normalizedText: string;
  extractedFields: IExtractedFields;
  redFlags: IRedFlag[];
  riskScore: number;
  riskLevel: RiskLevel;
}

interface DeterministicEvaluation {
  normalizedText: string;
  extractedFields: IExtractedFields;
  redFlags: IRedFlag[];
  totalWeight: number;
}

// Shared by both the authenticated and public flows (§8: normalize →
// evaluate rules → correlate) — the one rule-engine pipeline every
// submission source funnels into, so there is exactly one place that
// decides what a red flag is. Unchanged by Phase 7's AI integration: this
// function has no idea AI exists. Scoring itself now happens one level up,
// in runAnalysisPipeline, AFTER the AI merge step below has had a chance to
// run — see mergeAIFindings in ai/aiResultMerger.ts.
async function evaluateDeterministic(rawText: string): Promise<DeterministicEvaluation> {
  const { normalizedText, extractedFields } = normalizeJobPosting(rawText);
  const { redFlags, totalWeight, ruleConfidence } = await evaluateActiveRules(
    normalizedText,
    extractedFields,
  );

  // Correlation layer (Phase 6): runs strictly after the rule engine above
  // and only consumes its output — evaluateActiveRules() itself is
  // completely unchanged and unaware this exists. Purely additive: extra
  // flags/weight on top of what was already matched, never a replacement.
  const { correlationFlags, additionalWeight } = applyRuleCorrelations(redFlags);
  const allRedFlags = [...redFlags, ...correlationFlags];
  const combinedWeight = totalWeight + additionalWeight;

  // Dev-only: the rule engine now computes an internal per-flag confidence
  // (evidence count/strength — see ruleEngine.ts's computeMatchConfidence).
  // Not persisted and not part of the API response yet — surfaced here only
  // so it's observable while the engine is prepared for future use.
  if (env.isDevelopment && Object.keys(ruleConfidence).length > 0) {
    logger.debug({ ruleConfidence }, 'Rule engine: internal per-flag confidence');
  }
  if (env.isDevelopment && correlationFlags.length > 0) {
    logger.debug(
      { correlations: correlationFlags.map((f) => f.label), additionalWeight },
      'Correlation layer: applied',
    );
  }

  return { normalizedText, extractedFields, redFlags: allRedFlags, totalWeight: combinedWeight };
}

/**
 * Calls the configured AI provider (Groq today, via IAIProvider — never
 * imported concretely from this file, see ai/aiProviderFactory.ts) to
 * analyze the raw text. Never throws: AI_ENABLED=false, no provider
 * configured, a missing API key, a timeout, and an invalid response all
 * resolve to `null` here, so the caller always has a safe "AI unavailable"
 * value to hand to mergeAIFindings — the deterministic pipeline never
 * blocks on, or breaks because of, this call.
 */
async function runAIAnalysis(rawText: string): Promise<AIProviderAnalysisResult | null> {
  const provider = getAIProvider();
  if (!provider || !provider.isConfigured()) {
    if (env.isDevelopment) {
      logger.debug(
        { aiEnabled: env.AI_ENABLED, providerConfigured: provider?.isConfigured() ?? false },
        'AI analysis: skipped (disabled or not configured)',
      );
    }
    return null;
  }

  const startedAt = Date.now();
  try {
    const result = await provider.analyzeJobContent({ rawText });
    // Dev-only: whether AI was called, its confidence, and processing time
    // — never the raw text/prompt content, and never the API key.
    if (env.isDevelopment) {
      logger.debug(
        {
          provider: provider.name,
          isJobPosting: result.isJobPosting,
          confidence: result.confidence,
          processingTimeMs: Date.now() - startedAt,
        },
        'AI analysis: completed',
      );
    }
    return result;
  } catch (err) {
    const code = err instanceof AIProviderError ? err.code : 'UNKNOWN';
    if (env.isDevelopment) {
      logger.warn(
        { provider: provider.name, code, processingTimeMs: Date.now() - startedAt },
        'AI analysis: failed — continuing with the deterministic pipeline only',
      );
    } else {
      // Production: no processing-time/raw-content detail, just enough to
      // know AI degraded without exposing anything sensitive.
      logger.warn({ provider: provider.name, code }, 'AI analysis failed — continuing without it');
    }
    return null;
  }
}

interface PipelineResult extends EvaluatedPosting {
  aiExplanation: string | null;
  aiConfidence: number | null;
}

/**
 * The full pipeline both createAnalysis and createPublicAnalysis run
 * through: deterministic job-content validation (local, no external API —
 * blocks non-job text before any score is computed) → optional Gemini
 * validation (advisory, fail-open) → the existing rule engine (evaluateJobText
 * — unchanged, sole scoring authority) → optional Gemini explanation
 * (advisory, fail-open). Gemini can never set or override a score, and its
 * unavailability (no API key, timeout, quota, malformed response) never
 * blocks analysis — see docs/ARCHITECTURE.md §8.
 */
async function runAnalysisPipeline(rawText: string): Promise<PipelineResult> {
  // Deterministic gate, checked first: catches input that isn't a job
  // posting/recruitment message at all (chit-chat, gibberish) before it can
  // reach the rule engine, which would otherwise still produce a non-zero
  // score off rules that match on the ABSENCE of a signal (e.g.
  // MISSING_COMPANY_NAME matches any text without a detectable company
  // name, job-related or not). A scam job posting is still a job posting —
  // this only screens out content unrelated to jobs entirely.
  const contentValidation = validateJobContent(rawText);
  if (env.isDevelopment) {
    logger.debug(
      { isJobContent: contentValidation.isJobContent, confidence: contentValidation.confidence },
      'Job content validation: balanced-confidence result',
    );
  }
  if (!contentValidation.isJobContent) {
    throw new ApiError(400, contentValidation.reason);
  }

  const geminiConfigured = isGeminiConfigured();

  // TEMPORARY debug output (dev-only) — added to diagnose whether Gemini
  // validation is actually being invoked. Never logs the API key itself,
  // only its presence as a boolean. Remove once resolved.
  if (env.isDevelopment) {
    logger.debug({ geminiConfigured }, 'Gemini validation: GEMINI_API_KEY configured?');
  }

  if (geminiConfigured) {
    if (env.isDevelopment) {
      logger.debug('Gemini validation: calling validateJobPostingContent');
    }

    const validation = await validateJobPostingContent(rawText);

    if (env.isDevelopment) {
      logger.debug({ validation }, 'Gemini validation: response from Gemini');
    }

    const shouldReject = shouldRejectAsNonJobContent(validation);

    if (env.isDevelopment) {
      logger.debug({ shouldReject }, 'Gemini validation: shouldRejectAsNonJobContent result');
    }

    if (shouldReject) {
      throw new ApiError(
        400,
        validation?.reason ||
          'This does not appear to be a job posting. Please enter a job description, recruitment message, or offer letter to analyze.',
      );
    }
  }

  // Groq analysis (Phase 7 — hybrid pipeline): runs before the deterministic
  // engine below per the hybrid pipeline design, but its findings are only
  // ever merged in AFTER evaluateDeterministic() has already produced its
  // own redFlags/totalWeight — never fed into the rule engine or
  // correlation layer, and never able to skip or short-circuit either...
  // except for the document-classification gate immediately below, which
  // is a deliberate, separate exception to that rule (see Phase 8).
  const aiResult = await runAIAnalysis(rawText);

  // Document classification gate (Phase 8): the AI's classification is the
  // ONLY thing that can stop analysis before the rule engine runs — a
  // resume, assignment, or company brochure should never reach
  // MISSING_COMPANY_NAME/GENERIC_EMAIL_DOMAIN etc. at all, not just have
  // its own AI-suggested flags withheld (that's a different, existing gate
  // — see mergeAIFindings). Only fires when AI actually classified the
  // document (aiResult !== null) and is confident enough to trust; when AI
  // is disabled/unconfigured/failed, this block is skipped entirely and the
  // deterministic pipeline runs exactly as it did before this phase.
  if (aiResult) {
    const classification = evaluateDocumentClassification(
      aiResult.documentType,
      aiResult.documentTypeConfidence,
    );
    if (env.isDevelopment) {
      logger.debug(
        {
          documentType: aiResult.documentType,
          documentTypeConfidence: aiResult.documentTypeConfidence,
          shouldReject: classification.shouldReject,
        },
        'AI document classification: result',
      );
    }
    if (classification.shouldReject) {
      throw new ApiError(400, classification.message ?? 'This document is not a recruitment posting.', true, {
        documentType: aiResult.documentType,
        documentTypeConfidence: aiResult.documentTypeConfidence,
      });
    }
  }

  const deterministic = await evaluateDeterministic(rawText);

  // Additive-only merge (see aiResultMerger.ts for the safety limits): a
  // null aiResult (AI disabled/unconfigured/failed) makes this a no-op that
  // returns deterministic.redFlags/totalWeight completely untouched — the
  // exact same values the pipeline already produced before this phase.
  const merged = mergeAIFindings(
    { redFlags: deterministic.redFlags, totalWeight: deterministic.totalWeight },
    aiResult,
  );
  if (env.isDevelopment && merged.redFlags.length > deterministic.redFlags.length) {
    logger.debug(
      {
        addedFlags: merged.redFlags.length - deterministic.redFlags.length,
        additionalWeight: merged.totalWeight - deterministic.totalWeight,
      },
      'AI merge: added supporting red flags on top of the deterministic result',
    );
  }

  const riskScore = computeRiskScore(merged.totalWeight);
  const riskLevel = computeRiskLevel(riskScore);

  let aiExplanation = merged.aiExplanation;
  let aiConfidence = merged.aiConfidence;

  // Gemini's explanation layer is now a fallback: it only runs if Groq
  // didn't already produce a usable explanation above, so the single
  // aiExplanation/aiConfidence slot is never fought over by two AI calls,
  // and nothing changes for anyone currently relying on Gemini alone (Groq
  // disabled by default → aiExplanation is always null here → this branch
  // behaves exactly as it did before this phase).
  if (aiExplanation === null && isGeminiConfigured()) {
    const explanation = await generateExplanation({
      rawText,
      riskScore,
      riskLevel,
      redFlags: merged.redFlags,
      greenFlags: [],
    });
    if (explanation) {
      aiExplanation = formatExplanationForStorage(explanation);
      aiConfidence = explanation.confidence;
    }
  }

  return {
    normalizedText: deterministic.normalizedText,
    extractedFields: deterministic.extractedFields,
    redFlags: merged.redFlags,
    riskScore,
    riskLevel,
    aiExplanation,
    aiConfidence,
  };
}

export async function createAnalysis(
  userId: string,
  input: CreateAnalysisInput,
): Promise<AnalysisWithStatus> {
  // URL fetching/scraping is not implemented (explicitly out of scope). Rather
  // than silently running the rule engine against the URL string itself — which
  // has no fraud-signal keywords and would misleadingly come back "low risk" —
  // reject clearly before creating any record, so nothing meaningless gets saved.
  if (input.jobUrl) {
    throw new ApiError(
      400,
      'Analyzing a job posting from a URL is not available yet. Please paste the full job description text instead.',
    );
  }

  const submittedValue = input.jobText as string;
  const evaluated = await runAnalysisPipeline(submittedValue);

  const analysis = await analysisRepository.createAnalysis({
    userId: new Types.ObjectId(userId),
    rawJobText: submittedValue,
    normalizedText: evaluated.normalizedText,
    extractedFields: evaluated.extractedFields,
    riskScore: evaluated.riskScore,
    riskLevel: evaluated.riskLevel,
    redFlags: evaluated.redFlags,
    greenFlags: [],
    engineVersion: ENGINE_VERSION,
    isSaved: true,
    aiExplanation: evaluated.aiExplanation,
    aiConfidence: evaluated.aiConfidence,
  });

  return { analysis, status: deriveStatus(analysis) };
}

export interface PublicAnalysisSource {
  url?: string;
  // Fetched + parsed page content for `url` (engine/urlContentExtractor.ts),
  // produced by the controller before this function ever runs. `url` itself
  // is kept only for sourceMetadata — it is no longer used as analyzable text,
  // since two different URLs otherwise look near-identical to the rule engine.
  urlExtractedText?: string;
  urlExtractionError?: string | null;
  description?: string;
  file?: {
    originalName: string;
    extractedText: string;
  };
}

// Guest entry point (§3/§6/§7 of docs/ARCHITECTURE.md — IP-identified, no
// tokens issued). All provided sources are merged into one payload rather than
// analyzed separately, then run through the exact same evaluateJobText used by
// the authenticated flow above.
export async function createPublicAnalysis(
  source: PublicAnalysisSource,
): Promise<AnalysisWithStatus> {
  const segments = [source.description, source.file?.extractedText, source.urlExtractedText]
    .map((segment) => segment?.trim())
    .filter((segment): segment is string => Boolean(segment));

  const combinedText = segments.join('\n\n').trim();
  if (!combinedText) {
    throw new ApiError(400, 'Could not extract any analyzable content from the provided input.');
  }

  // TEMPORARY debug output (dev-only) — see analysis.controller.ts for context.
  if (env.isDevelopment) {
    logger.debug(
      {
        combinedTextLength: combinedText.length,
        descriptionLength: source.description?.trim().length ?? 0,
        urlExtractedTextLength: source.urlExtractedText?.trim().length ?? 0,
        fileExtractedTextLength: source.file?.extractedText.trim().length ?? 0,
      },
      'createPublicAnalysis combined text before evaluateJobText',
    );
  }

  const evaluated = await runAnalysisPipeline(combinedText);

  const analysis = await analysisRepository.createAnalysis({
    userId: null,
    rawJobText: combinedText,
    normalizedText: evaluated.normalizedText,
    extractedFields: evaluated.extractedFields,
    riskScore: evaluated.riskScore,
    riskLevel: evaluated.riskLevel,
    redFlags: evaluated.redFlags,
    greenFlags: [],
    engineVersion: ENGINE_VERSION,
    isSaved: false,
    aiExplanation: evaluated.aiExplanation,
    aiConfidence: evaluated.aiConfidence,
    sourceMetadata: {
      url: source.url ?? null,
      hasDescription: Boolean(source.description),
      fileName: source.file?.originalName ?? null,
      urlExtractionError: source.urlExtractionError ?? null,
    },
  });

  return { analysis, status: deriveStatus(analysis) };
}

export async function getAnalysisById(
  analysisId: string,
  requester: AccessTokenPayload | null,
): Promise<AnalysisWithStatus> {
  const analysis = await analysisRepository.findAnalysisById(analysisId);
  if (!analysis) {
    throw new ApiError(404, 'Analysis not found');
  }

  // Guest-run analyses (userId: null) were never tied to an account, so
  // there's no ownership to protect — anyone with the id can view the result,
  // same as the response the guest already received at submit time.
  const isPublicAnalysis = analysis.userId === null;
  const isOwner = requester !== null && analysis.userId?.toString() === requester.userId;
  const isAdmin = requester?.role === 'admin';

  if (!isPublicAnalysis && !isOwner && !isAdmin) {
    throw new ApiError(403, 'You do not have access to this analysis');
  }

  return { analysis, status: deriveStatus(analysis) };
}

// Redacted, always-public view for the "Share Report" link — works for ANY
// analysis id (guest or an authenticated user's own), unlike getAnalysisById
// above which stays ownership-checked for owned records. Deliberately a
// narrower field set than IJobAnalysis: no rawJobText/normalizedText (the
// actual submitted text may contain personal info), no contactEmail/
// contactPhone, no userId/companyId/sourceMetadata. Same collection, same
// analysisRepository — not a second analysis pipeline, just a stricter DTO.
export interface PublicReportDTO {
  id: string;
  riskScore: number;
  riskLevel: RiskLevel;
  redFlags: IRedFlag[];
  greenFlags: IJobAnalysis['greenFlags'];
  aiExplanation: string | null;
  aiConfidence: number | null;
  engineVersion: string;
  createdAt: Date;
  jobTitle: string | null;
  companyName: string | null;
}

export async function getPublicReport(analysisId: string): Promise<PublicReportDTO> {
  const analysis = await analysisRepository.findAnalysisById(analysisId);
  if (!analysis) {
    throw new ApiError(404, 'Report not found');
  }

  return {
    id: (analysis._id as Types.ObjectId).toString(),
    riskScore: analysis.riskScore,
    riskLevel: analysis.riskLevel,
    redFlags: analysis.redFlags,
    greenFlags: analysis.greenFlags,
    aiExplanation: analysis.aiExplanation,
    aiConfidence: analysis.aiConfidence,
    engineVersion: analysis.engineVersion,
    createdAt: analysis.createdAt,
    jobTitle: analysis.extractedFields.jobTitle,
    companyName: analysis.extractedFields.companyName,
  };
}

export async function getAnalysisHistory(
  userId: string,
  page: number,
  limit: number,
): Promise<AnalysisHistoryResult> {
  const { items, total } = await analysisRepository.findSavedAnalysesByUser(
    new Types.ObjectId(userId),
    page,
    limit,
  );

  return {
    items: items.map((analysis) => ({ analysis, status: deriveStatus(analysis) })),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}
