import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISubscriptionAuditLog extends Document {
  applicationId: mongoose.Types.ObjectId;
  accountId: mongoose.Types.ObjectId;
  actorId?: mongoose.Types.ObjectId;
  action: string;
  oldPlan?: {
    id?: mongoose.Types.ObjectId;
    slug?: string;
    name?: string;
  };
  newPlan?: {
    id?: mongoose.Types.ObjectId;
    slug?: string;
    name?: string;
  };
  oldStatus?: string;
  newStatus?: string;
  reason?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

const subscriptionAuditLogSchema = new Schema<ISubscriptionAuditLog>(
  {
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
      index: true,
    },
    accountId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true,
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    oldPlan: {
      id: { type: Schema.Types.ObjectId, ref: 'Plan' },
      slug: { type: String },
      name: { type: String },
    },
    newPlan: {
      id: { type: Schema.Types.ObjectId, ref: 'Plan' },
      slug: { type: String },
      name: { type: String },
    },
    oldStatus: { type: String },
    newStatus: { type: String },
    reason: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

subscriptionAuditLogSchema.index({ applicationId: 1, createdAt: -1 });
subscriptionAuditLogSchema.index({ accountId: 1, createdAt: -1 });

export const SubscriptionAuditLog: Model<ISubscriptionAuditLog> = mongoose.model<ISubscriptionAuditLog>(
  'SubscriptionAuditLog',
  subscriptionAuditLogSchema,
);
