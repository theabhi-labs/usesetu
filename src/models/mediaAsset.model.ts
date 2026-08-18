import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMediaAsset extends Document {
  url: string;
  fileId: string;
  fileName: string;
  folder: string;
  mimeType: string;
  size: number;
  tags: string[];

  uploadedBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const mediaAssetSchema = new Schema<IMediaAsset>(
  {
    url: { type: String, required: true },
    fileId: { type: String, required: true },
    fileName: { type: String, required: true },
    folder: { type: String, default: 'general' },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    tags: { type: [String], default: [] },

    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

mediaAssetSchema.index({ folder: 1, createdAt: -1 });
mediaAssetSchema.index({ fileName: 'text', tags: 'text' });

export const MediaAsset: Model<IMediaAsset> = mongoose.model<IMediaAsset>('MediaAsset', mediaAssetSchema);
