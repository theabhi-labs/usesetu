import { tenantPlugin } from '../utils/tenantPlugin';
import mongoose, { Schema, Document, Model } from 'mongoose';

export enum CommentVisibility {
  INTERNAL = 'internal', // staff/admin only — never shown to the customer
  PUBLIC = 'public', // visible on the public tracking page
  CUSTOMER = 'customer', // visible to the logged-in customer, not on the public page
}

export interface IRequestComment extends Document {
  request: mongoose.Types.ObjectId;
  author: mongoose.Types.ObjectId;
  authorRole: string;
  visibility: CommentVisibility;
  message: string;
  createdAt: Date;
}

const requestCommentSchema = new Schema<IRequestComment>(
  {
    request: { type: Schema.Types.ObjectId, ref: 'Request', required: true, index: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    authorRole: { type: String, required: true },
    visibility: { type: String, enum: Object.values(CommentVisibility), default: CommentVisibility.INTERNAL },
    message: { type: String, required: true, maxlength: 2000 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

requestCommentSchema.index({ request: 1, createdAt: 1 });

requestCommentSchema.plugin(tenantPlugin);

export const RequestComment: Model<IRequestComment> = mongoose.model<IRequestComment>(
  'RequestComment',
  requestCommentSchema,
);
