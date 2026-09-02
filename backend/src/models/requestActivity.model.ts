import { tenantPlugin } from '../utils/tenantPlugin';
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IRequestActivity extends Document {
  request: mongoose.Types.ObjectId;
  action: string; // e.g. REQUEST_CREATED, STAGE_CHANGED, ASSIGNED, DOCUMENT_UPLOADED, DOCUMENT_VERIFIED, PAYMENT_UPDATED
  performedBy: mongoose.Types.ObjectId;
  performedByRole: string;
  description?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const requestActivitySchema = new Schema<IRequestActivity>(
  {
    request: { type: Schema.Types.ObjectId, ref: 'Request', required: true, index: true },
    action: { type: String, required: true },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    performedByRole: { type: String, required: true },
    description: String,
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

requestActivitySchema.index({ request: 1, createdAt: -1 });

requestActivitySchema.plugin(tenantPlugin);

export const RequestActivity: Model<IRequestActivity> = mongoose.model<IRequestActivity>(
  'RequestActivity',
  requestActivitySchema,
);
