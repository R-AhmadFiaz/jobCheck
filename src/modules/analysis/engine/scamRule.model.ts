import { Document, Schema, model } from 'mongoose';

export type ScamRuleSeverity = 'low' | 'medium' | 'high';

export interface IScamRule extends Document {
  key: string;
  description: string;
  category: string;
  matcher: Record<string, unknown>;
  weight: number;
  severity: ScamRuleSeverity;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const scamRuleSchema = new Schema<IScamRule>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    // Not a closed enum: §5/§8 describe categories as representative, not exhaustive —
    // admins must be able to introduce new ones as data, without a redeploy.
    category: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    matcher: {
      type: Schema.Types.Mixed,
      required: true,
    },
    weight: {
      type: Number,
      required: true,
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high'],
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

scamRuleSchema.index({ isActive: 1 });

export const ScamRule = model<IScamRule>('ScamRule', scamRuleSchema);
