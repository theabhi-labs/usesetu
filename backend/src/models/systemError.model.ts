import mongoose, { Schema, Document } from 'mongoose';

export interface ISystemError extends Document {
  fingerprint: string;
  errorCode: string;
  message: string;
  stackHash?: string;
  route: string;
  method: string;
  requestId?: string;
  accountId?: mongoose.Types.ObjectId;
  applicationId?: mongoose.Types.ObjectId;
  tenantId?: mongoose.Types.ObjectId;
  environment: string;
  severity: 'P0' | 'P1' | 'P2' | 'P3' | 'INFO' | 'WARN' | 'ERROR';
  firstSeenAt: Date;
  lastSeenAt: Date;
  occurrenceCount: number;
  resolvedAt?: Date;
  status: 'UNRESOLVED' | 'RESOLVED' | 'IGNORED';
  createdAt: Date;
  updatedAt: Date;
}

const systemErrorSchema = new Schema<ISystemError>(
  {
    fingerprint: { type: String, required: true, unique: true, index: true },
    errorCode: { type: String, required: true, default: 'INTERNAL_SERVER_ERROR', index: true },
    message: { type: String, required: true },
    stackHash: { type: String },
    route: { type: String, required: true, index: true },
    method: { type: String, required: true },
    requestId: { type: String },
    accountId: { type: Schema.Types.ObjectId, ref: 'Account', index: true },
    applicationId: { type: Schema.Types.ObjectId, ref: 'Application', index: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', index: true },
    environment: { type: String, default: 'production' },
    severity: {
      type: String,
      enum: ['P0', 'P1', 'P2', 'P3', 'INFO', 'WARN', 'ERROR'],
      default: 'ERROR',
      index: true,
    },
    firstSeenAt: { type: Date, default: Date.now },
    lastSeenAt: { type: Date, default: Date.now, index: true },
    occurrenceCount: { type: Number, default: 1 },
    resolvedAt: { type: Date },
    status: {
      type: String,
      enum: ['UNRESOLVED', 'RESOLVED', 'IGNORED'],
      default: 'UNRESOLVED',
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

systemErrorSchema.index({ status: 1, severity: 1, lastSeenAt: -1 });

export const SystemError = mongoose.model<ISystemError>('SystemError', systemErrorSchema);
