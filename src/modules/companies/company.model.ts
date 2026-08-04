import { Document, Schema, model } from 'mongoose';

export type CompanyVerificationStatus =
  'unverified' | 'community_verified' | 'admin_verified' | 'blockchain_verified';

export interface ICompany extends Document {
  name: string;
  normalizedName: string;
  website: string | null;
  aggregatedRiskScore: number;
  totalAnalyses: number;
  totalReports: number;
  verificationStatus: CompanyVerificationStatus;
  blockchainRecordHash: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const companySchema = new Schema<ICompany>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    normalizedName: {
      type: String,
      required: true,
      trim: true,
    },
    website: {
      type: String,
      default: null,
      trim: true,
    },
    aggregatedRiskScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    totalAnalyses: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalReports: {
      type: Number,
      default: 0,
      min: 0,
    },
    verificationStatus: {
      type: String,
      enum: ['unverified', 'community_verified', 'admin_verified', 'blockchain_verified'],
      default: 'unverified',
    },
    blockchainRecordHash: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

companySchema.index({ name: 1 });
// Not unique: duplicates are expected pre-merge (§12.6 admin merge workflow).
companySchema.index({ normalizedName: 1 });

export const Company = model<ICompany>('Company', companySchema);
