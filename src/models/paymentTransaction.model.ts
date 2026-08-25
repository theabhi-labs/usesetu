import mongoose, { Schema, Document, Model } from 'mongoose';
import { BillingCycle } from './subscription.model';

export enum PaymentTransactionStatus {
  CREATED = 'created',
  AUTHORIZED = 'authorized',
  CAPTURED = 'captured',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
  CANCELLED = 'cancelled',
}

export interface IPaymentTransaction extends Document {
  accountId: mongoose.Types.ObjectId;
  applicationId: mongoose.Types.ObjectId;
  subscriptionId?: mongoose.Types.ObjectId;
  planId: mongoose.Types.ObjectId;
  billingCycle: BillingCycle;
  provider: string;
  providerOrderId?: string;
  providerPaymentId?: string;
  providerInvoiceId?: string;
  amount: number; // In minor units (paise, e.g. 49900 for ₹499.00)
  currency: string;
  status: PaymentTransactionStatus;
  method?: string; // card, upi, netbanking, wallet, emi
  description?: string;
  metadata?: Record<string, any>;
  paidAt?: Date;
  failedAt?: Date;
  failureReason?: string;
  refundedAt?: Date;
  refundAmount?: number;
  createdAt: Date;
  updatedAt: Date;
}

const paymentTransactionSchema = new Schema<IPaymentTransaction>(
  {
    accountId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true,
    },
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
      index: true,
    },
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: 'Subscription',
      index: true,
    },
    planId: {
      type: Schema.Types.ObjectId,
      ref: 'Plan',
      required: true,
      index: true,
    },
    billingCycle: {
      type: String,
      enum: Object.values(BillingCycle),
      default: BillingCycle.MONTHLY,
      required: true,
    },
    provider: {
      type: String,
      required: true,
      default: 'razorpay',
      trim: true,
    },
    providerOrderId: {
      type: String,
      trim: true,
    },
    providerPaymentId: {
      type: String,
      trim: true,
    },
    providerInvoiceId: {
      type: String,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      default: 'INR',
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(PaymentTransactionStatus),
      default: PaymentTransactionStatus.CREATED,
      index: true,
    },
    method: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    paidAt: {
      type: Date,
    },
    failedAt: {
      type: Date,
    },
    failureReason: {
      type: String,
    },
    refundedAt: {
      type: Date,
    },
    refundAmount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

// Indexes
paymentTransactionSchema.index(
  { provider: 1, providerPaymentId: 1 },
  { unique: true, partialFilterExpression: { providerPaymentId: { $type: 'string' } } },
);
paymentTransactionSchema.index(
  { provider: 1, providerOrderId: 1 },
  { unique: true, partialFilterExpression: { providerOrderId: { $type: 'string' } } },
);
paymentTransactionSchema.index({ applicationId: 1, createdAt: -1 });
paymentTransactionSchema.index({ subscriptionId: 1, createdAt: -1 });
paymentTransactionSchema.index({ accountId: 1, createdAt: -1 });

export const PaymentTransaction: Model<IPaymentTransaction> = mongoose.model<IPaymentTransaction>(
  'PaymentTransaction',
  paymentTransactionSchema,
);
