import mongoose, { Schema, Document, Model } from 'mongoose';

export enum WebhookEventStatus {
  RECEIVED = 'received',
  PROCESSING = 'processing',
  PROCESSED = 'processed',
  FAILED = 'failed',
  IGNORED = 'ignored',
}

export interface IPaymentWebhookEvent extends Document {
  provider: string;
  eventId: string;
  eventType: string;
  payloadHash: string;
  receivedAt: Date;
  processedAt?: Date;
  status: WebhookEventStatus;
  processingAttempts: number;
  durationMs?: number;
  resolutionStatus?: string;
  lastError?: string;
  applicationId?: mongoose.Types.ObjectId;
  accountId?: mongoose.Types.ObjectId;
  providerEntityId?: string;
  payload?: Record<string, any>;
  headers?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const paymentWebhookEventSchema = new Schema<IPaymentWebhookEvent>(
  {
    provider: {
      type: String,
      required: true,
      default: 'razorpay',
      trim: true,
    },
    eventId: {
      type: String,
      required: true,
      trim: true,
    },
    eventType: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    payloadHash: {
      type: String,
      required: true,
    },
    receivedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    processedAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: Object.values(WebhookEventStatus),
      default: WebhookEventStatus.RECEIVED,
      index: true,
    },
    processingAttempts: {
      type: Number,
      default: 0,
    },
    durationMs: {
      type: Number,
    },
    resolutionStatus: {
      type: String,
      trim: true,
    },
    lastError: {
      type: String,
    },
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: 'Application',
      index: true,
    },
    accountId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      index: true,
    },
    providerEntityId: {
      type: String,
      trim: true,
    },
    payload: {
      type: Schema.Types.Mixed,
    },
    headers: {
      type: Schema.Types.Mixed,
    },
  },
  { timestamps: true },
);

// Idempotency: Exactly one event record per provider event ID
paymentWebhookEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });
paymentWebhookEventSchema.index({ status: 1, receivedAt: -1 });

export const PaymentWebhookEvent: Model<IPaymentWebhookEvent> = mongoose.model<IPaymentWebhookEvent>(
  'PaymentWebhookEvent',
  paymentWebhookEventSchema,
);
