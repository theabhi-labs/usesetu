import mongoose, { Schema, Document, Model } from 'mongoose';

export enum ApplicationStatus {
  PROVISIONING = 'provisioning',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  EXPIRED = 'expired',
  FAILED = 'failed',
  ARCHIVED = 'archived',
}

export interface IApplication extends Document {
  tenantId: mongoose.Types.ObjectId; // References Tenant
  accountId: mongoose.Types.ObjectId; // References Account
  templateId: mongoose.Types.ObjectId; // References ApplicationTemplate
  templateVersion: number;
  name: string;
  slug: string;
  status: ApplicationStatus;
  createdAt: Date;
  updatedAt: Date;
}

const applicationSchema = new Schema<IApplication>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    accountId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true,
    },
    templateId: {
      type: Schema.Types.ObjectId,
      ref: 'ApplicationTemplate',
      required: true,
      index: true,
    },
    templateVersion: {
      type: Number,
      required: true,
    },
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
      match: [/^[a-z0-9-]+$/, 'Invalid slug format'],
    },
    status: {
      type: String,
      enum: Object.values(ApplicationStatus),
      default: ApplicationStatus.PROVISIONING,
      index: true,
    },
  },
  { timestamps: true },
);

// Compound Indexes for fast dashboard lists and security boundary lookup queries
applicationSchema.index({ accountId: 1, status: 1 });
applicationSchema.index({ tenantId: 1, status: 1 });

export const Application: Model<IApplication> = mongoose.model<IApplication>('Application', applicationSchema);
