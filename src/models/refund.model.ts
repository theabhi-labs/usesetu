import { tenantPlugin } from '../utils/tenantPlugin';
import mongoose, { Schema, Document, Model } from 'mongoose';

export enum RefundStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PROCESSED = 'processed',
}

export interface IRefund extends Document {
  payment: mongoose.Types.ObjectId;
  request: mongoose.Types.ObjectId;
  amount: number;
  reason: string;
  status: RefundStatus;
  processedBy?: mongoose.Types.ObjectId;
  processedAt?: Date;
  remarks?: string;
  createdBy: mongoose.Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const refundSchema = new Schema<IRefund>(
  {
    payment: { type: Schema.Types.ObjectId, ref: 'Payment', required: true, index: true },
    request: { type: Schema.Types.ObjectId, ref: 'Request', required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    reason: { type: String, required: true },
    status: { type: String, enum: Object.values(RefundStatus), default: RefundStatus.PROCESSED },
    processedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    processedAt: Date,
    remarks: String,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

refundSchema.index({ request: 1, createdAt: -1 });
refundSchema.index({ status: 1, createdAt: -1 });

refundSchema.plugin(tenantPlugin);

export const Refund: Model<IRefund> = mongoose.model<IRefund>('Refund', refundSchema);
