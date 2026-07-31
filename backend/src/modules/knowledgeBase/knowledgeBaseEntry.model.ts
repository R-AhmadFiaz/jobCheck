import { Document, Schema, Types, model } from 'mongoose';
import { RISK_LEVELS, type RiskLevel } from '@/shared/types/riskLevel';

export type KnowledgeBaseEntityType = 'company' | 'recruiter' | 'identifier';

export interface ICommonPattern {
  ruleKey: string;
  ruleCategory: string;
  occurrences: number;
}

export interface IKnowledgeBaseEntry extends Document {
  entityType: KnowledgeBaseEntityType;
  entityRefId: Types.ObjectId;
  searchTerms: string[];
  trustScore: number;
  verificationStatus: string;
  riskLevel: RiskLevel;
  analysesCount: number;
  reportsCount: number;
  confirmedScamCount: number;
  confirmedLegitCount: number;
  commonPatterns: ICommonPattern[];
  aiSummary: string | null;
  safetyRecommendations: string[] | null;
  lastActivityAt: Date;
  recomputedAt: Date;
}

const commonPatternSchema = new Schema<ICommonPattern>(
  {
    ruleKey: { type: String, required: true, trim: true },
    ruleCategory: { type: String, required: true, trim: true },
    occurrences: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const knowledgeBaseEntrySchema = new Schema<IKnowledgeBaseEntry>({
  entityType: {
    type: String,
    enum: ['company', 'recruiter', 'identifier'],
    required: true,
  },
  entityRefId: {
    // Polymorphic (Company | Recruiter | Identifier per entityType) — no static
    // `ref`; populated by the recompute service once it exists.
    type: Schema.Types.ObjectId,
    required: true,
  },
  searchTerms: {
    type: [String],
    default: [],
  },
  trustScore: {
    type: Number,
    default: 50,
    min: 0,
    max: 100,
  },
  verificationStatus: {
    type: String,
    default: 'unverified',
  },
  riskLevel: {
    type: String,
    enum: RISK_LEVELS,
    required: true,
  },
  analysesCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  reportsCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  confirmedScamCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  confirmedLegitCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  commonPatterns: {
    type: [commonPatternSchema],
    default: [],
  },
  aiSummary: {
    type: String,
    default: null,
  },
  safetyRecommendations: {
    type: [String],
    default: null,
  },
  lastActivityAt: {
    type: Date,
    required: true,
  },
  recomputedAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
});

// One projection row per entity.
knowledgeBaseEntrySchema.index({ entityType: 1, entityRefId: 1 }, { unique: true });
knowledgeBaseEntrySchema.index({ searchTerms: 'text' });
knowledgeBaseEntrySchema.index({ riskLevel: 1 });

export const KnowledgeBaseEntry = model<IKnowledgeBaseEntry>(
  'KnowledgeBaseEntry',
  knowledgeBaseEntrySchema,
);
