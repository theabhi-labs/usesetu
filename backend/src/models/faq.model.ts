import { tenantPlugin } from '../utils/tenantPlugin';
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IFaq extends Document {
  question: string;
  answer: string;
  category?: string;
  service?: mongoose.Types.ObjectId;
  sortOrder: number;
  isActive: boolean;

  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const faqSchema = new Schema<IFaq>(
  {
    question: { type: String, required: true },
    answer: { type: String, required: true },
    category: String,
    service: { type: Schema.Types.ObjectId, ref: 'Service' },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

faqSchema.index({ category: 1, isActive: 1, sortOrder: 1 });
faqSchema.index({ service: 1, isActive: 1 });
faqSchema.index({ question: 'text', answer: 'text' });

faqSchema.plugin(tenantPlugin);

export const Faq: Model<IFaq> = mongoose.model<IFaq>('Faq', faqSchema);
