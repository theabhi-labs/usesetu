import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ILockerDocument extends Document {
  customer: mongoose.Types.ObjectId;
  type: string; // e.g. 'aadhaar', 'pan', 'photo', 'signature', etc.
  url: string;
  fileId: string;
  originalName: string;
  size: number;
  mimeType: string;
  createdAt: Date;
  updatedAt: Date;
}

const lockerDocumentSchema = new Schema<ILockerDocument>(
  {
    customer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, required: true },
    url: { type: String, required: true },
    fileId: { type: String, required: true },
    originalName: { type: String, required: true },
    size: { type: Number, required: true },
    mimeType: { type: String, required: true },
  },
  { timestamps: true }
);

// Customer-level quick querying of locker documents
lockerDocumentSchema.index({ customer: 1, createdAt: -1 });

export const LockerDocument: Model<ILockerDocument> = mongoose.model<ILockerDocument>('LockerDocument', lockerDocumentSchema);
