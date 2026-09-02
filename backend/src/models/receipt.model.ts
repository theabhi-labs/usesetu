import { tenantPlugin } from '../utils/tenantPlugin';
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IReceipt extends Document {
  receiptNumber: string;
  payment: mongoose.Types.ObjectId;
  request: mongoose.Types.ObjectId;
  customer: mongoose.Types.ObjectId;

  amount: number;
  paymentMethod: string;
  balanceAfterPayment: number;

  generatedAt: Date;
  createdAt: Date;
}

const receiptSchema = new Schema<IReceipt>(
  {
    receiptNumber: { type: String, required: true, unique: true },
    payment: { type: Schema.Types.ObjectId, ref: 'Payment', required: true, unique: true },
    request: { type: Schema.Types.ObjectId, ref: 'Request', required: true },
    customer: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    amount: { type: Number, required: true },
    paymentMethod: { type: String, required: true },
    balanceAfterPayment: { type: Number, required: true },

    generatedAt: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// payment already unique-indexed above (one receipt per payment).
receiptSchema.index({ request: 1, createdAt: -1 });
receiptSchema.index({ customer: 1, createdAt: -1 });

receiptSchema.plugin(tenantPlugin);

export const Receipt: Model<IReceipt> = mongoose.model<IReceipt>('Receipt', receiptSchema);
