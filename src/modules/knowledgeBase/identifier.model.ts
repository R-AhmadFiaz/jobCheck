import { Document, Schema, Types, model } from 'mongoose';

export type IdentifierType = 'email' | 'domain' | 'phone';

export interface IIdentifier extends Document {
  type: IdentifierType;
  value: string;
  normalizedValue: string;
  companyId: Types.ObjectId | null;
  recruiterId: Types.ObjectId | null;
  mergedIntoId: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const identifierSchema = new Schema<IIdentifier>(
  {
    type: {
      type: String,
      enum: ['email', 'domain', 'phone'],
      required: true,
    },
    value: {
      type: String,
      required: true,
      trim: true,
    },
    normalizedValue: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      default: null,
    },
    recruiterId: {
      type: Schema.Types.ObjectId,
      ref: 'Recruiter',
      default: null,
    },
    mergedIntoId: {
      type: Schema.Types.ObjectId,
      ref: 'Identifier',
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

identifierSchema.index({ type: 1, normalizedValue: 1 }, { unique: true });
identifierSchema.index({ companyId: 1 });
identifierSchema.index({ recruiterId: 1 });

export const Identifier = model<IIdentifier>('Identifier', identifierSchema);
