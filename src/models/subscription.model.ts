import mongoose, { Schema, Document, Model } from 'mongoose';
import { IPlanEntitlements } from './plan.model';

export enum SubscriptionStatus {
  TRIALING = 'trialing',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  PAUSED = 'paused',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

export enum BillingCycle {
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

export interface IPlanSnapshot {
  planId: mongoose.Types.ObjectId;
  slug: string;
  name: string;
  entitlements: IPlanEntitlements;
  version: number;
}

export interface IPaymentGatewayRef {
  provider?: string;
  customerId?: string;
  subscriptionId?: string;
  metadata?: Record<string, any>;
}

export interface ISubscription extends Document {
  applicationId: mongoose.Types.ObjectId;
  planId: mongoose.Types.ObjectId;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  startsAt: Date;
  endsAt?: Date;
  trialEndsAt?: Date;
  cancelledAt?: Date;
  planSnapshot?: IPlanSnapshot;
  paymentGateway?: IPaymentGatewayRef;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const planSnapshotSchema = new Schema<IPlanSnapshot>(
  {
    planId: { type: Schema.Types.ObjectId, ref: 'Plan', required: true },
    slug: { type: String, required: true },
    name: { type: String, required: true },
    entitlements: { type: Schema.Types.Mixed, required: true },
    version: { type: Number, required: true },
  },
  { _id: false },
);

const paymentGatewaySchema = new Schema<IPaymentGatewayRef>(
  {
    provider: { type: String },
    customerId: { type: String },
    subscriptionId: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  { _id: false },
);

const subscriptionSchema = new Schema<ISubscription>(
  {
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
    },
    planId: {
      type: Schema.Types.ObjectId,
      ref: 'Plan',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(SubscriptionStatus),
      default: SubscriptionStatus.ACTIVE,
      index: true,
    },
    billingCycle: {
      type: String,
      enum: Object.values(BillingCycle),
      default: BillingCycle.MONTHLY,
    },
    startsAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    endsAt: {
      type: Date,
    },
    trialEndsAt: {
      type: Date,
    },
    cancelledAt: {
      type: Date,
    },
    planSnapshot: {
      type: planSnapshotSchema,
    },
    paymentGateway: {
      type: paymentGatewaySchema,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true },
);

// Enforce rule: An application has at most one active or trialing subscription at a time
subscriptionSchema.index(
  { applicationId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
    },
  },
);

subscriptionSchema.index({ applicationId: 1, status: 1 });
subscriptionSchema.index({ endsAt: 1, status: 1 });

export const Subscription: Model<ISubscription> = mongoose.model<ISubscription>('Subscription', subscriptionSchema);
