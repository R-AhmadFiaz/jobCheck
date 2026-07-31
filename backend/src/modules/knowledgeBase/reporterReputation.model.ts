import { Document, Schema, Types, model } from 'mongoose';

export interface IReporterReputation extends Document {
  userId: Types.ObjectId;
  reliabilityScore: number;
  reportsApproved: number;
  reportsRejected: number;
  updatedAt: Date;
}

const reporterReputationSchema = new Schema<IReporterReputation>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    reliabilityScore: {
      type: Number,
      default: 50,
      min: 0,
      max: 100,
    },
    reportsApproved: {
      type: Number,
      default: 0,
      min: 0,
    },
    reportsRejected: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: { createdAt: false, updatedAt: true },
  },
);

export const ReporterReputation = model<IReporterReputation>(
  'ReporterReputation',
  reporterReputationSchema,
);
