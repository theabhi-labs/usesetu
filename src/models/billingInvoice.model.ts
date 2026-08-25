import mongoose, { Schema, Document, Model } from 'mongoose';
import { BillingCycle } from './subscription.model';

export enum BillingInvoiceStatus {
  DRAFT = 'draft',
  ISSUED = 'issued',
  PAID = 'paid',
  FAILED = 'failed',
  VOID = 'void',
  REFUNDED = 'refunded',
}

export interface IBillingInvoice extends Document {
  accountId: mongoose.Types.ObjectId;
  applicationId: mongoose.Types.ObjectId;
  subscriptionId?: mongoose.Types.ObjectId;
  paymentTransactionId?: mongoose.Types.ObjectId;
  planId: mongoose.Types.ObjectId;
  billingCycle: BillingCycle;
  provider: string;
  providerInvoiceId?: string;
  invoiceNumber: string;
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  status: BillingInvoiceStatus;
  issuedAt: Date;
  dueAt?: Date;
  paidAt?: Date;
  hostedInvoiceUrl?: string;
  pdfUrl?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const billingInvoiceSchema = new Schema<IBillingInvoice>(
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
    paymentTransactionId: {
      type: Schema.Types.ObjectId,
      ref: 'PaymentTransaction',
      index: true,
    },
    planId: {
      type: Schema.Types.ObjectId,
      ref: 'Plan',
      required: true,
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
    providerInvoiceId: {
      type: String,
      trim: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    tax: {
      type: Number,
      default: 0,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(BillingInvoiceStatus),
      default: BillingInvoiceStatus.ISSUED,
      index: true,
    },
    issuedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    dueAt: {
      type: Date,
    },
    paidAt: {
      type: Date,
    },
    hostedInvoiceUrl: {
      type: String,
      trim: true,
    },
    pdfUrl: {
      type: String,
      trim: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true },
);

// Indexes
billingInvoiceSchema.index(
  { provider: 1, providerInvoiceId: 1 },
  { unique: true, partialFilterExpression: { providerInvoiceId: { $type: 'string' } } },
);
billingInvoiceSchema.index({ applicationId: 1, createdAt: -1 });
billingInvoiceSchema.index({ accountId: 1, createdAt: -1 });

export const BillingInvoice: Model<IBillingInvoice> = mongoose.model<IBillingInvoice>(
  'BillingInvoice',
  billingInvoiceSchema,
);
