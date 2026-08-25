import { tenantPlugin } from '../utils/tenantPlugin';
import mongoose, { Schema, Document, Model } from 'mongoose';

export enum PaymentType {
  ADVANCE = 'advance',
  PARTIAL = 'partial',
  FULL = 'full',
}

export enum PaymentMethod {
  CASH = 'cash',
  UPI = 'upi',
  QR_CODE = 'qr_code',
  BANK_TRANSFER = 'bank_transfer',
  ONLINE_GATEWAY = 'online_gateway',
}

export enum PaymentStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
}

export interface IPayment extends Document {
  request: mongoose.Types.ObjectId;
  customer: mongoose.Types.ObjectId;
  service: mongoose.Types.ObjectId;

  paymentType: PaymentType;
  paymentMethod: PaymentMethod;
  amount: number;
  refundedAmount: number;

  status: PaymentStatus;
  transactionId?: string;
  gatewayReference?: string;

  verifiedBy?: mongoose.Types.ObjectId;
  remarks?: string;
  paidAt: Date;

  createdBy: mongoose.Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    request: { type: Schema.Types.ObjectId, ref: 'Request', required: true, index: true },
    customer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    service: { type: Schema.Types.ObjectId, ref: 'Service', required: true },

    paymentType: { type: String, enum: Object.values(PaymentType), required: true },
    paymentMethod: { type: String, enum: Object.values(PaymentMethod), required: true },
    amount: { type: Number, required: true, min: 0 },
    refundedAmount: { type: Number, default: 0, min: 0 },

    status: { type: String, enum: Object.values(PaymentStatus), default: PaymentStatus.SUCCESS, index: true },
    transactionId: { type: String },
    gatewayReference: { type: String },

    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    remarks: String,
    paidAt: { type: Date, default: Date.now },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

// ── Index strategy ──────────────────────────────────────────────────
// 1. Every payment for a request, newest first — the request detail page's payment tab.
paymentSchema.index({ request: 1, createdAt: -1 });
// 2. Customer's own payment history.
paymentSchema.index({ customer: 1, createdAt: -1 });
// 3. Daily/monthly collection reports — status+date range scan.
paymentSchema.index({ status: 1, createdAt: -1 });
// 4. Gateway/UPI transaction lookup for reconciliation. Sparse: most cash
//    payments have no transactionId, and a non-sparse unique index would
//    reject every second null.
paymentSchema.index({ transactionId: 1 }, { sparse: true });

paymentSchema.plugin(tenantPlugin);

export const Payment: Model<IPayment> = mongoose.model<IPayment>('Payment', paymentSchema);
