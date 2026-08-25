import mongoose, { Schema, Document, Model } from 'mongoose';

export enum TemplateStatus {
  ACTIVE = 'active',
  DEPRECATED = 'deprecated',
}

export interface IApplicationTemplate extends Document {
  name: string;
  slug: string;
  category: string; // e.g. "digital_service_center"
  description?: string;
  status: TemplateStatus;
  version: number;
  configuration: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const applicationTemplateSchema = new Schema<IApplicationTemplate>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      index: true,
    },
    description: {
      type: String,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: Object.values(TemplateStatus),
      default: TemplateStatus.ACTIVE,
      index: true,
    },
    version: {
      type: Number,
      default: 1,
    },
    configuration: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true },
);

export const ApplicationTemplate: Model<IApplicationTemplate> = mongoose.model<IApplicationTemplate>(
  'ApplicationTemplate',
  applicationTemplateSchema,
);
