import { Types } from 'mongoose';
import type { IJobAnalysis } from '@/modules/analysis/analysis.model';
import * as analysisRepository from '@/modules/analysis/analysis.repository';
import type { CreateAnalysisInput } from '@/modules/analysis/analysis.validation';
import type { AccessTokenPayload } from '@/shared/utils/jwt';
import { ApiError } from '@/shared/utils/ApiError';
import { normalizeJobPosting } from '@/modules/analysis/engine/textNormalizer';
import { evaluateActiveRules, ENGINE_VERSION } from '@/modules/analysis/engine/ruleEngine';
import { computeRiskScore, computeRiskLevel } from '@/modules/analysis/engine/scoring';

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

export async function createAnalysis(
  userId: string,
  input: CreateAnalysisInput,
): Promise<AnalysisWithStatus> {
  // No scraping yet: whichever the client submitted (pasted text or a URL) is
  // stored as-is; the normalizer treats a bare URL as having nothing to extract.
  const submittedValue = (input.jobText ?? input.jobUrl) as string;

  const { normalizedText, extractedFields } = normalizeJobPosting(submittedValue);
  const { redFlags, totalWeight } = await evaluateActiveRules(normalizedText, extractedFields);
  const riskScore = computeRiskScore(totalWeight);
  const riskLevel = computeRiskLevel(riskScore);

  const analysis = await analysisRepository.createAnalysis({
    userId: new Types.ObjectId(userId),
    rawJobText: submittedValue,
    normalizedText,
    extractedFields,
    riskScore,
    riskLevel,
    redFlags,
    greenFlags: [],
    engineVersion: ENGINE_VERSION,
    isSaved: true,
  });

  return { analysis, status: deriveStatus(analysis) };
}

export async function getAnalysisById(
  analysisId: string,
  requester: AccessTokenPayload,
): Promise<AnalysisWithStatus> {
  const analysis = await analysisRepository.findAnalysisById(analysisId);
  if (!analysis) {
    throw new ApiError(404, 'Analysis not found');
  }

  const isOwner = analysis.userId?.toString() === requester.userId;
  if (!isOwner && requester.role !== 'admin') {
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
