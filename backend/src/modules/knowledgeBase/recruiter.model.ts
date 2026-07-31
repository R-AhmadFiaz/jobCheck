import { Document, Schema, Types, model } from 'mongoose';

export interface IRecruiter extends Document {
  name: string;
  aliases: string[];
  associatedCompanyIds: Types.ObjectId[];
  associatedIdentifierIds: Types.ObjectId[];
  mergedIntoId: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const recruiterSchema = new Schema<IRecruiter>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    aliases: {
      type: [String],
      default: [],
    },
    associatedCompanyIds: {
      type: [Schema.Types.ObjectId],
      ref: 'Company',
      default: [],
    },
    associatedIdentifierIds: {
      type: [Schema.Types.ObjectId],
      ref: 'Identifier',
      default: [],
    },
    mergedIntoId: {
      type: Schema.Types.ObjectId,
      ref: 'Recruiter',
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

recruiterSchema.index({ name: 'text' });
recruiterSchema.index({ associatedCompanyIds: 1 });
recruiterSchema.index({ associatedIdentifierIds: 1 });

export const Recruiter = model<IRecruiter>('Recruiter', recruiterSchema);
