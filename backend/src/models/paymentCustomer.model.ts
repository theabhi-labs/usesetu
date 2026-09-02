import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPaymentCustomer extends Document {
  accountId: mongoose.Types.ObjectId;
  applicationId: mongoose.Types.ObjectId;
  provider: string;
  providerCustomerId: string;
  email: string;
  name: string;
  status: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const paymentCustomerSchema = new Schema<IPaymentCustomer>(
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
    provider: {
      type: String,
      required: true,
      default: 'razorpay',
      trim: true,
    },
    providerCustomerId: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      default: 'active',
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true },
);

// Compound Unique Indexes for fast lookup & idempotency
paymentCustomerSchema.index({ provider: 1, providerCustomerId: 1 }, { unique: true });
paymentCustomerSchema.index({ accountId: 1, applicationId: 1, provider: 1 }, { unique: true });

export const PaymentCustomer: Model<IPaymentCustomer> = mongoose.model<IPaymentCustomer>(
  'PaymentCustomer',
  paymentCustomerSchema,
);
