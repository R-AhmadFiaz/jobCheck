import { Types } from 'mongoose';
import {
  KnowledgeBaseEntry,
  type IKnowledgeBaseEntry,
  type KnowledgeBaseEntityType,
} from '@/modules/knowledgeBase/knowledgeBaseEntry.model';
import { Company } from '@/modules/companies/company.model';
import { Recruiter } from '@/modules/knowledgeBase/recruiter.model';
import { Identifier } from '@/modules/knowledgeBase/identifier.model';
import { ApiError } from '@/shared/utils/ApiError';
import type { RiskLevel } from '@/shared/types/riskLevel';
import type {
  CreateKnowledgeEntryInput,
  ListKnowledgeQuery,
  UpdateKnowledgeEntryInput,
} from '@/modules/knowledgeBase/knowledgeBase.validation';

// The frontend's Knowledge Base types (already built, not to be redesigned).
// These are intentionally distinct from the backend's own KnowledgeBaseEntityType
// / RiskLevel — see docs/ARCHITECTURE.md §12.2 for why, and the mapping tables below.
export type FrontendEntryType = 'company' | 'recruiter' | 'domain';
export type FrontendRiskLevel = 'safe' | 'suspicious' | 'high_risk' | 'confirmed_scam';

const FRONTEND_TO_BACKEND_TYPE: Record<FrontendEntryType, KnowledgeBaseEntityType> = {
  company: 'company',
  recruiter: 'recruiter',
  domain: 'identifier',
};

const BACKEND_TO_FRONTEND_TYPE: Record<KnowledgeBaseEntityType, FrontendEntryType> = {
  company: 'company',
  recruiter: 'recruiter',
  identifier: 'domain',
};

const FRONTEND_TO_BACKEND_RISK: Record<FrontendRiskLevel, RiskLevel> = {
  safe: 'low',
  suspicious: 'medium',
  high_risk: 'high',
  confirmed_scam: 'critical',
};

const BACKEND_TO_FRONTEND_RISK: Record<RiskLevel, FrontendRiskLevel> = {
  low: 'safe',
  medium: 'suspicious',
  high: 'high_risk',
  critical: 'confirmed_scam',
};

export interface KnowledgeCommunityReportDTO {
  id: string;
  category: string;
  description: string;
  reportedAt: string;
}

export interface KnowledgeEntryDTO {
  id: string;
  type: FrontendEntryType;
  name: string;
  trustScore: number;
  riskLevel: FrontendRiskLevel;
  description: string;
  indicators: string[];
  communityReports: KnowledgeCommunityReportDTO[];
  verificationStatus: string;
  createdAt: string;
  domain?: string | null;
  associatedCompany?: string | null;
}

function toDTO(entry: IKnowledgeBaseEntry): KnowledgeEntryDTO {
  return {
    id: (entry._id as Types.ObjectId).toString(),
    type: BACKEND_TO_FRONTEND_TYPE[entry.entityType],
    name: entry.name,
    trustScore: entry.trustScore,
    riskLevel: BACKEND_TO_FRONTEND_RISK[entry.riskLevel],
    description: entry.description,
    indicators: entry.indicators,
    communityReports: entry.communityReports.map((report) => ({
      id: report._id.toString(),
      category: report.category,
      description: report.description,
      reportedAt: report.reportedAt.toISOString(),
    })),
    verificationStatus: entry.verificationStatus,
    createdAt: entry.createdAt.toISOString(),
    domain: entry.domain,
    associatedCompany: entry.associatedCompany,
  };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000;
}

export interface KnowledgeSearchResultDTO {
  query: string;
  type: FrontendEntryType;
  items: KnowledgeEntryDTO[];
}

export async function searchEntries(
  type: FrontendEntryType,
  query: string,
): Promise<KnowledgeSearchResultDTO> {
  const entityType = FRONTEND_TO_BACKEND_TYPE[type];
  const filter: Record<string, unknown> = { entityType };

  const trimmed = query.trim();
  if (trimmed) {
    const pattern = new RegExp(escapeRegex(trimmed), 'i');
    filter.$or = [{ name: pattern }, { domain: pattern }, { associatedCompany: pattern }];
  }

  // Riskiest matches surface first — the point of the lookup is spotting danger.
  const entries = await KnowledgeBaseEntry.find(filter).sort({ trustScore: 1 }).limit(50);

  return { query, type, items: entries.map(toDTO) };
}

export interface PaginatedKnowledgeEntries {
  items: KnowledgeEntryDTO[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export async function listEntries(query: ListKnowledgeQuery): Promise<PaginatedKnowledgeEntries> {
  const filter: Record<string, unknown> = {};
  if (query.type) filter.entityType = FRONTEND_TO_BACKEND_TYPE[query.type];
  if (query.riskLevel) filter.riskLevel = FRONTEND_TO_BACKEND_RISK[query.riskLevel];
  if (query.verificationStatus) filter.verificationStatus = query.verificationStatus;

  const skip = (query.page - 1) * query.limit;
  const [entries, total] = await Promise.all([
    KnowledgeBaseEntry.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit),
    KnowledgeBaseEntry.countDocuments(filter),
  ]);

  return {
    items: entries.map(toDTO),
    page: query.page,
    limit: query.limit,
    total,
    totalPages: Math.ceil(total / query.limit),
  };
}

export async function getEntryById(id: string): Promise<KnowledgeEntryDTO> {
  const entry = await KnowledgeBaseEntry.findById(id);
  if (!entry) {
    throw new ApiError(404, 'Knowledge base entry not found');
  }
  return toDTO(entry);
}

async function resolveOrCreateEntityRef(
  type: FrontendEntryType,
  name: string,
  domain: string | undefined,
): Promise<{ entityType: KnowledgeBaseEntityType; entityRefId: Types.ObjectId }> {
  if (type === 'company') {
    const normalizedName = name.trim().toLowerCase();
    const company =
      (await Company.findOne({ normalizedName })) ??
      (await Company.create({ name, normalizedName, website: domain ?? null }));
    return { entityType: 'company', entityRefId: company._id as Types.ObjectId };
  }

  if (type === 'recruiter') {
    const recruiter =
      (await Recruiter.findOne({ name: new RegExp(`^${escapeRegex(name)}$`, 'i') })) ??
      (await Recruiter.create({ name }));
    return { entityType: 'recruiter', entityRefId: recruiter._id as Types.ObjectId };
  }

  const normalizedValue = name.trim().toLowerCase();
  const identifier =
    (await Identifier.findOne({ type: 'domain', normalizedValue })) ??
    (await Identifier.create({ type: 'domain', value: name, normalizedValue }));
  return { entityType: 'identifier', entityRefId: identifier._id as Types.ObjectId };
}

export async function createEntry(input: CreateKnowledgeEntryInput): Promise<KnowledgeEntryDTO> {
  const { entityType, entityRefId } = await resolveOrCreateEntityRef(
    input.type,
    input.name,
    input.domain,
  );

  try {
    const entry = await KnowledgeBaseEntry.create({
      entityType,
      entityRefId,
      searchTerms: [input.name.trim().toLowerCase()],
      name: input.name,
      description: input.description,
      indicators: input.indicators,
      domain: input.domain ?? null,
      associatedCompany: input.associatedCompany ?? null,
      communityReports: [],
      trustScore: input.trustScore,
      riskLevel: FRONTEND_TO_BACKEND_RISK[input.riskLevel],
      verificationStatus: input.verificationStatus,
      lastActivityAt: new Date(),
      recomputedAt: new Date(),
    });
    return toDTO(entry);
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      throw new ApiError(409, `A knowledge base entry for "${input.name}" already exists`);
    }
    throw err;
  }
}

export async function updateEntry(
  id: string,
  input: UpdateKnowledgeEntryInput,
): Promise<KnowledgeEntryDTO> {
  const entry = await KnowledgeBaseEntry.findById(id);
  if (!entry) {
    throw new ApiError(404, 'Knowledge base entry not found');
  }

  if (input.description !== undefined) entry.description = input.description;
  if (input.trustScore !== undefined) entry.trustScore = input.trustScore;
  if (input.riskLevel !== undefined) entry.riskLevel = FRONTEND_TO_BACKEND_RISK[input.riskLevel];
  if (input.indicators !== undefined) entry.indicators = input.indicators;
  if (input.verificationStatus !== undefined) entry.verificationStatus = input.verificationStatus;
  if (input.domain !== undefined) entry.domain = input.domain;
  if (input.associatedCompany !== undefined) entry.associatedCompany = input.associatedCompany;

  await entry.save();
  return toDTO(entry);
}
