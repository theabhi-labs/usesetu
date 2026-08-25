import mongoose, { Schema, Document, Model } from 'mongoose';

export enum DomainType {
  DEFAULT = 'default',
  SUBDOMAIN = 'subdomain',
  CUSTOM = 'custom',
}

export enum DomainStatus {
  PENDING = 'pending',
  VERIFYING = 'verifying',
  VERIFIED = 'verified',
  ACTIVE = 'active',
  FAILED = 'failed',
  DISABLED = 'disabled',
}

export enum VerificationMethod {
  CNAME = 'cname',
  TXT = 'txt',
}

export enum SslStatus {
  PENDING = 'pending',
  PROVISIONING = 'provisioning',
  ACTIVE = 'active',
  FAILED = 'failed',
}

export interface IApplicationDomain extends Document {
  applicationId: mongoose.Types.ObjectId;
  hostname: string;
  type: DomainType;
  status: DomainStatus;
  isPrimary: boolean;
  verificationMethod?: VerificationMethod;
  verificationToken?: string;
  verificationExpectedValue?: string;
  verificationAttempts: number;
  lastVerificationAt?: Date;
  verifiedAt?: Date;
  activatedAt?: Date;
  disabledAt?: Date;
  disabledBy?: mongoose.Types.ObjectId;
  disabledReason?: string;
  sslStatus: SslStatus;
  sslProvider?: string;
  verificationError?: string;
  createdAt: Date;
  updatedAt: Date;
}

const applicationDomainSchema = new Schema<IApplicationDomain>(
  {
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
      index: true,
    },
    hostname: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    type: {
      type: String,
      enum: Object.values(DomainType),
      default: DomainType.DEFAULT,
    },
    status: {
      type: String,
      enum: Object.values(DomainStatus),
      default: DomainStatus.ACTIVE,
    },
    isPrimary: {
      type: Boolean,
      default: true,
    },
    verificationMethod: {
      type: String,
      enum: Object.values(VerificationMethod),
      default: VerificationMethod.CNAME,
    },
    verificationToken: {
      type: String,
      trim: true,
    },
    verificationExpectedValue: {
      type: String,
      trim: true,
    },
    verificationAttempts: {
      type: Number,
      default: 0,
    },
    lastVerificationAt: {
      type: Date,
    },
    verifiedAt: {
      type: Date,
    },
    activatedAt: {
      type: Date,
    },
    disabledAt: {
      type: Date,
    },
    disabledBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    disabledReason: {
      type: String,
      trim: true,
    },
    sslStatus: {
      type: String,
      enum: Object.values(SslStatus),
      default: SslStatus.ACTIVE,
    },
    sslProvider: {
      type: String,
      default: 'cloudflare',
    },
    verificationError: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true },
);

// Indexes
applicationDomainSchema.index({ applicationId: 1, type: 1 });
applicationDomainSchema.index({ applicationId: 1, isPrimary: 1 });
applicationDomainSchema.index({ applicationId: 1, status: 1 });

export const ApplicationDomain: Model<IApplicationDomain> = mongoose.model<IApplicationDomain>(
  'ApplicationDomain',
  applicationDomainSchema,
);
