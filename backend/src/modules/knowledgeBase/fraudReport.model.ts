import { Document, Schema, Types, model } from 'mongoose';

export type FraudReportTargetType = 'company' | 'recruiter' | 'identifier';
export type FraudReportVerdict = 'scam' | 'suspicious' | 'legit';
export type FraudReportStatus = 'pending' | 'approved' | 'rejected';

export interface IFraudReport extends Document {
  reporterId: Types.ObjectId;
  targetType: FraudReportTargetType;
  targetId: Types.ObjectId;
  verdict: FraudReportVerdict;
  description: string;
  evidenceUrls: string[];
  status: FraudReportStatus;
  moderatedBy: Types.ObjectId | null;
  usefulVotes: number;
  notUsefulVotes: number;
  createdAt: Date;
  updatedAt: Date;
}

const fraudReportSchema = new Schema<IFraudReport>(
  {
    reporterId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    targetType: {
      type: String,
      enum: ['company', 'recruiter', 'identifier'],
      required: true,
    },
    targetId: {
      // Polymorphic (Company | Recruiter | Identifier per targetType) — no static
      // `ref`; resolved by the service layer once it exists.
      type: Schema.Types.ObjectId,
      required: true,
    },
    verdict: {
      type: String,
      enum: ['scam', 'suspicious', 'legit'],
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    evidenceUrls: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    moderatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    usefulVotes: {
      type: Number,
      default: 0,
      min: 0,
    },
    notUsefulVotes: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

fraudReportSchema.index({ targetType: 1, targetId: 1 });
fraudReportSchema.index({ reporterId: 1 });
fraudReportSchema.index({ status: 1 });

export const FraudReport = model<IFraudReport>('FraudReport', fraudReportSchema);
