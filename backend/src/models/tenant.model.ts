import mongoose, { Schema, Document, Model } from 'mongoose';

export enum TenantStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  PROVISIONING = 'provisioning',
  ARCHIVED = 'archived',
}

export interface ITenant extends Document {
  name: string;
  slug: string;
  status: TenantStatus;
  category: string; // e.g. "digital_service_center"
  ownerId?: mongoose.Types.ObjectId; // User who owns/created the tenant
  accountId?: mongoose.Types.ObjectId; // Account that owns the tenant
  createdAt: Date;
  updatedAt: Date;
}

const tenantSchema = new Schema<ITenant>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
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
      enum: Object.values(TenantStatus),
      default: TenantStatus.ACTIVE,
      index: true,
    },
    category: {
      type: String,
      default: 'digital_service_center',
      index: true,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    accountId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      index: true,
    },
  },
  { timestamps: true },
);

export const Tenant: Model<ITenant> = mongoose.model<ITenant>('Tenant', tenantSchema);
