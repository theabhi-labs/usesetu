import mongoose, { Schema, Document } from 'mongoose';

export type SecurityEventType =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'SUSPICIOUS_LOGIN'
  | 'JWT_REJECTED'
  | 'TENANT_MISMATCH'
  | 'ACCOUNT_MISMATCH'
  | 'AUTHORIZATION_FAILED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'WEBHOOK_SIGNATURE_FAILED'
  | 'INVALID_DOMAIN_VERIFICATION';

export type SecurityEventSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ISecurityEvent extends Document {
  eventType: SecurityEventType;
  severity: SecurityEventSeverity;
  userId?: mongoose.Types.ObjectId;
  accountId?: mongoose.Types.ObjectId;
  applicationId?: mongoose.Types.ObjectId;
  tenantId?: mongoose.Types.ObjectId;
  ipAddress?: string;
  userAgent?: string;
  route?: string;
  method?: string;
  requestId?: string;
  details?: Record<string, unknown>;
  createdAt: Date;
}

const securityEventSchema = new Schema<ISecurityEvent>(
  {
    eventType: {
      type: String,
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM',
      index: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    accountId: { type: Schema.Types.ObjectId, ref: 'Account', index: true },
    applicationId: { type: Schema.Types.ObjectId, ref: 'Application', index: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', index: true },
    ipAddress: { type: String },
    userAgent: { type: String },
    route: { type: String },
    method: { type: String },
    requestId: { type: String },
    details: { type: Schema.Types.Mixed },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

securityEventSchema.index({ eventType: 1, severity: 1, createdAt: -1 });

export const SecurityEvent = mongoose.model<ISecurityEvent>('SecurityEvent', securityEventSchema);
