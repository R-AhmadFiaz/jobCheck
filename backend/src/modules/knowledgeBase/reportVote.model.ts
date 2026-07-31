import { Document, Schema, Types, model } from 'mongoose';

export interface IReportVote extends Document {
  reportId: Types.ObjectId;
  userId: Types.ObjectId;
  value: 1 | -1;
  createdAt: Date;
}

const reportVoteSchema = new Schema<IReportVote>(
  {
    reportId: {
      type: Schema.Types.ObjectId,
      ref: 'FraudReport',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    value: {
      type: Number,
      enum: [1, -1],
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

// One vote per user per report, enforced at the DB level.
reportVoteSchema.index({ reportId: 1, userId: 1 }, { unique: true });

export const ReportVote = model<IReportVote>('ReportVote', reportVoteSchema);
