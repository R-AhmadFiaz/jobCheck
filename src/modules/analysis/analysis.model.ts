import { Document, Schema, Types, model } from 'mongoose';
import { RISK_LEVELS, type RiskLevel } from '@/shared/types/riskLevel';

export interface IExtractedFields {
  companyName: string | null;
  jobTitle: string | null;
  salaryRange: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  location: string | null;
}

export interface IRedFlag {
  ruleId: Types.ObjectId;
  label: string;
  description: string;
  weight: number;
  severity: 'low' | 'medium' | 'high';
}

export interface IGreenFlag {
  label: string;
  description: string;
}

// Populated only for anonymous/public submissions (analysis.service.ts
// createPublicAnalysis) — records how the combined text was assembled, since
// rawJobText alone no longer shows which of url/description/file contributed.
export interface ISourceMetadata {
  url: string | null;
  hasDescription: boolean;
  fileName: string | null;
  // Non-null only when a url was submitted and fetching/extracting its content
  // failed — the analysis still ran on whatever other input was available.
  // See engine/urlContentExtractor.ts.
  urlExtractionError: string | null;
}

export interface IJobAnalysis extends Document {
  userId: Types.ObjectId | null;
  rawJobText: string;
  normalizedText: string;
  extractedFields: IExtractedFields;
  companyId: Types.ObjectId | null;
  riskScore: number;
  riskLevel: RiskLevel;
  redFlags: IRedFlag[];
  greenFlags: IGreenFlag[];
  aiExplanation: string | null;
  aiConfidence: number | null;
  engineVersion: string;
  isSaved: boolean;
  sourceMetadata: ISourceMetadata | null;
  createdAt: Date;
}

const extractedFieldsSchema = new Schema<IExtractedFields>(
  {
    companyName: { type: String, default: null, trim: true },
    jobTitle: { type: String, default: null, trim: true },
    salaryRange: { type: String, default: null, trim: true },
    contactEmail: { type: String, default: null, trim: true, lowercase: true },
    contactPhone: { type: String, default: null, trim: true },
    location: { type: String, default: null, trim: true },
  },
  { _id: false },
);

const redFlagSchema = new Schema<IRedFlag>(
  {
    // Soft reference by design (§5): flags are a frozen snapshot even if the rule changes later.
    ruleId: { type: Schema.Types.ObjectId, ref: 'ScamRule', required: true },
    label: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    weight: { type: Number, required: true },
    severity: { type: String, enum: ['low', 'medium', 'high'], required: true },
  },
  { _id: false },
);

const greenFlagSchema = new Schema<IGreenFlag>(
  {
    label: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const sourceMetadataSchema = new Schema<ISourceMetadata>(
  {
    url: { type: String, default: null, trim: true },
    hasDescription: { type: Boolean, default: false },
    fileName: { type: String, default: null, trim: true },
    urlExtractionError: { type: String, default: null },
  },
  { _id: false },
);

const jobAnalysisSchema = new Schema<IJobAnalysis>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    rawJobText: {
      type: String,
      required: true,
    },
    normalizedText: {
      type: String,
      required: true,
    },
    extractedFields: {
      type: extractedFieldsSchema,
      default: () => ({}),
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      default: null,
    },
    riskScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    riskLevel: {
      type: String,
      enum: RISK_LEVELS,
      required: true,
    },
    redFlags: {
      type: [redFlagSchema],
      default: [],
    },
    greenFlags: {
      type: [greenFlagSchema],
      default: [],
    },
    aiExplanation: {
      type: String,
      default: null,
    },
    aiConfidence: {
      type: Number,
      default: null,
      min: 0,
      max: 1,
    },
    engineVersion: {
      type: String,
      required: true,
    },
    isSaved: {
      type: Boolean,
      default: false,
    },
    sourceMetadata: {
      type: sourceMetadataSchema,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

jobAnalysisSchema.index({ userId: 1, createdAt: -1 });
jobAnalysisSchema.index({ companyId: 1 });

export const JobAnalysis = model<IJobAnalysis>('JobAnalysis', jobAnalysisSchema);
