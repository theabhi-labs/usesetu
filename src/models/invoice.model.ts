import mongoose, { Schema, Document, Model } from 'mongoose';
import { PaymentSummaryStatus } from './request.model';

interface ILineItem {
  label: string;
  amount: number;
}

export interface IInvoice extends Document {
  invoiceNumber: string;
  request: mongoose.Types.ObjectId;
  service: mongoose.Types.ObjectId;
  customer: mongoose.Types.ObjectId;

  customerName: string;
  customerMobile: string;

  lineItems: ILineItem[];
  discount: number;
  taxAmount: number;
  totalAmount: number;

  status: PaymentSummaryStatus;

  createdAt: Date;
  updatedAt: Date;
}

const lineItemSchema = new Schema<ILineItem>({ label: String, amount: Number }, { _id: false });

const invoiceSchema = new Schema<IInvoice>(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    request: { type: Schema.Types.ObjectId, ref: 'Request', required: true, unique: true },
    service: { type: Schema.Types.ObjectId, ref: 'Service', required: true },
    customer: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    customerName: { type: String, required: true },
    customerMobile: { type: String, required: true },

    lineItems: { type: [lineItemSchema], default: [] },
    discount: { type: Number, default: 0, min: 0 },
    taxAmount: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },

    status: { type: String, enum: Object.values(PaymentSummaryStatus), default: PaymentSummaryStatus.PENDING },
  },
  { timestamps: true },
);

// request already unique-indexed above (one invoice per request).
invoiceSchema.index({ customer: 1, createdAt: -1 });

export const Invoice: Model<IInvoice> = mongoose.model<IInvoice>('Invoice', invoiceSchema);
