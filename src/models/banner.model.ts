import { tenantPlugin } from '../utils/tenantPlugin';
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBanner extends Document {
  title?: string;
  subtitle?: string;
  image: { url: string; fileId: string };
  ctaText?: string;
  ctaLink?: string;
  device: 'desktop' | 'mobile' | 'both';
  sortOrder: number;
  startDate?: Date;
  endDate?: Date;
  isActive: boolean;

  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const bannerSchema = new Schema<IBanner>(
  {
    title: String,
    subtitle: String,
    image: {
      url: { type: String, required: true },
      fileId: { type: String, required: true },
    },
    ctaText: String,
    ctaLink: String,
    device: { type: String, enum: ['desktop', 'mobile', 'both'], default: 'both' },
    sortOrder: { type: Number, default: 0 },
    startDate: Date,
    endDate: Date,
    isActive: { type: Boolean, default: true },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

// Powers the public homepage query: active banners currently within schedule, in order.
bannerSchema.index({ isActive: 1, sortOrder: 1 });

bannerSchema.plugin(tenantPlugin);

export const Banner: Model<IBanner> = mongoose.model<IBanner>('Banner', bannerSchema);
