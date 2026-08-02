import { Types } from 'mongoose';
import type { IExtractedFields, IJobAnalysis, IRedFlag } from '@/modules/analysis/analysis.model';
import * as analysisRepository from '@/modules/analysis/analysis.repository';
import type { CreateAnalysisInput } from '@/modules/analysis/analysis.validation';
import type { AccessTokenPayload } from '@/shared/utils/jwt';
import { ApiError } from '@/shared/utils/ApiError';
import { normalizeJobPosting } from '@/modules/analysis/engine/textNormalizer';
import { evaluateActiveRules, ENGINE_VERSION } from '@/modules/analysis/engine/ruleEngine';
import { computeRiskScore, computeRiskLevel } from '@/modules/analysis/engine/scoring';
import type { RiskLevel } from '@/shared/types/riskLevel';
import { env } from '@/config/env';
import { logger } from '@/shared/utils/logger';

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

// Shared by both the authenticated and public flows (§8: normalize → evaluate
// rules → score) — the one rule-engine pipeline every submission source funnels
// into, so there is exactly one place that decides what a risk score means.
async function evaluateJobText(rawText: string): Promise<EvaluatedPosting> {
  const { normalizedText, extractedFields } = normalizeJobPosting(rawText);
  const { redFlags, totalWeight } = await evaluateActiveRules(normalizedText, extractedFields);
  const riskScore = computeRiskScore(totalWeight);
  const riskLevel = computeRiskLevel(riskScore);
  return { normalizedText, extractedFields, redFlags, riskScore, riskLevel };
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
  const evaluated = await evaluateJobText(submittedValue);

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

  const evaluated = await evaluateJobText(combinedText);

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
