import { Document, Schema, Types, model } from 'mongoose';
import { RISK_LEVELS, type RiskLevel } from '@/shared/types/riskLevel';

export type KnowledgeBaseEntityType = 'company' | 'recruiter' | 'identifier';

export interface ICommonPattern {
  ruleKey: string;
  ruleCategory: string;
  occurrences: number;
}

// Illustrative report content authored directly on the entry for this phase —
// NOT the real Community Reports system (FraudReport/ReportVote, untouched).
// Once real user-submitted + moderated reports exist, this field is what gets
// replaced by an aggregation over FraudReport, per docs/ARCHITECTURE.md §12.2.
export interface ICommunityReportSeed {
  _id: Types.ObjectId;
  category: string;
  description: string;
  reportedAt: Date;
}

export interface IKnowledgeBaseEntry extends Document {
  entityType: KnowledgeBaseEntityType;
  entityRefId: Types.ObjectId;
  searchTerms: string[];
  // Denormalized display fields (Phase "Knowledge Base backend" addition — see
  // §12.2). Populated from the linked Company/Recruiter/Identifier at create
  // time so reads never need a cross-collection lookup.
  name: string;
  description: string;
  indicators: string[];
  domain: string | null;
  associatedCompany: string | null;
  communityReports: ICommunityReportSeed[];
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
  createdAt: Date;
  updatedAt: Date;
}

const commonPatternSchema = new Schema<ICommonPattern>(
  {
    ruleKey: { type: String, required: true, trim: true },
    ruleCategory: { type: String, required: true, trim: true },
    occurrences: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const communityReportSeedSchema = new Schema<ICommunityReportSeed>({
  category: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  reportedAt: { type: Date, required: true },
});

const knowledgeBaseEntrySchema = new Schema<IKnowledgeBaseEntry>(
  {
    entityType: {
      type: String,
      enum: ['company', 'recruiter', 'identifier'],
      required: true,
    },
    entityRefId: {
      // Polymorphic (Company | Recruiter | Identifier per entityType) — no static
      // `ref`; resolved by the service layer (knowledgeBase.service.ts).
      type: Schema.Types.ObjectId,
      required: true,
    },
    searchTerms: {
      type: [String],
      default: [],
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    indicators: {
      type: [String],
      default: [],
    },
    domain: {
      type: String,
      default: null,
      trim: true,
    },
    associatedCompany: {
      type: String,
      default: null,
      trim: true,
    },
    communityReports: {
      type: [communityReportSeedSchema],
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
  },
  {
    timestamps: true,
  },
);

// One projection row per entity.
knowledgeBaseEntrySchema.index({ entityType: 1, entityRefId: 1 }, { unique: true });
knowledgeBaseEntrySchema.index({ searchTerms: 'text' });
knowledgeBaseEntrySchema.index({ riskLevel: 1 });

export const KnowledgeBaseEntry = model<IKnowledgeBaseEntry>(
  'KnowledgeBaseEntry',
  knowledgeBaseEntrySchema,
);
