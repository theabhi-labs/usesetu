import mongoose, { Schema, Document, Model } from 'mongoose';

export enum PlanStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived',
}

export interface IPlanEntitlements {
  activeUsers: { limit: number };
  storage: { limit: number; unit: string }; // limit in bytes
  customDomain: { enabled: boolean; limit?: number };
  whatsapp: { enabled: boolean };
  email: { enabled: boolean };
  monthlyMessages: { limit: number };
  monthlyRequests: { limit: number };
  monthlyAppointments: { limit: number };
  exportReports: { enabled: boolean };
  customBranding: { enabled: boolean };
}

export interface IPlanPricing {
  currency: string;
  monthly: number;
  yearly: number;
}

export interface IPlan extends Document {
  name: string;
  slug: string;
  description: string;
  status: PlanStatus;
  isDefault: boolean;
  pricing: IPlanPricing;
  entitlements: IPlanEntitlements;
  metadata?: Record<string, any>;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const planEntitlementsSchema = new Schema<IPlanEntitlements>(
  {
    activeUsers: {
      limit: { type: Number, required: true, default: 5 },
    },
    storage: {
      limit: { type: Number, required: true, default: 524288000 }, // 500 MB in bytes
      unit: { type: String, default: 'bytes' },
    },
    customDomain: {
      enabled: { type: Boolean, default: false },
      limit: { type: Number, default: 0 },
    },
    whatsapp: {
      enabled: { type: Boolean, default: false },
    },
    email: {
      enabled: { type: Boolean, default: true },
    },
    monthlyMessages: {
      limit: { type: Number, required: true, default: 100 },
    },
    monthlyRequests: {
      limit: { type: Number, required: true, default: 200 },
    },
    monthlyAppointments: {
      limit: { type: Number, required: true, default: 50 },
    },
    exportReports: {
      enabled: { type: Boolean, default: false },
    },
    customBranding: {
      enabled: { type: Boolean, default: false },
    },
  },
  { _id: false },
);

const planPricingSchema = new Schema<IPlanPricing>(
  {
    currency: { type: String, required: true, default: 'INR' },
    monthly: { type: Number, required: true, default: 0 },
    yearly: { type: Number, required: true, default: 0 },
  },
  { _id: false },
);

const planSchema = new Schema<IPlan>(
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
      match: [/^[a-z0-9-]+$/, 'Invalid slug format'],
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: Object.values(PlanStatus),
      default: PlanStatus.ACTIVE,
      index: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
      index: true,
    },
    pricing: {
      type: planPricingSchema,
      required: true,
    },
    entitlements: {
      type: planEntitlementsSchema,
      required: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    version: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: true },
);

planSchema.index({ status: 1, isDefault: 1 });

export const Plan: Model<IPlan> = mongoose.model<IPlan>('Plan', planSchema);
