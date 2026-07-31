import type { Types } from 'mongoose';
import { JobAnalysis, type IJobAnalysis } from '@/modules/analysis/analysis.model';

export interface CreateAnalysisData {
  userId: Types.ObjectId;
  rawJobText: string;
  normalizedText: string;
  extractedFields: IJobAnalysis['extractedFields'];
  riskScore: number;
  riskLevel: IJobAnalysis['riskLevel'];
  redFlags: IJobAnalysis['redFlags'];
  greenFlags: IJobAnalysis['greenFlags'];
  engineVersion: string;
  isSaved: boolean;
}

export function createAnalysis(data: CreateAnalysisData): Promise<IJobAnalysis> {
  return JobAnalysis.create(data);
}

export function findAnalysisById(id: string): Promise<IJobAnalysis | null> {
  return JobAnalysis.findById(id);
}

export interface PaginatedAnalyses {
  items: IJobAnalysis[];
  total: number;
}

export async function findSavedAnalysesByUser(
  userId: Types.ObjectId,
  page: number,
  limit: number,
): Promise<PaginatedAnalyses> {
  const skip = (page - 1) * limit;
  const filter = { userId, isSaved: true };

  const [items, total] = await Promise.all([
    JobAnalysis.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    JobAnalysis.countDocuments(filter),
  ]);

  return { items, total };
}
