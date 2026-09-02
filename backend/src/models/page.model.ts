import { tenantPlugin } from '../utils/tenantPlugin';
import mongoose, { Schema, Document, Model } from 'mongoose';

export enum PageType {
  PAGE = 'page',
  LEGAL = 'legal',
}

export interface IPage extends Document {
  slug: string;
  title: string;
  content: string;
  type: PageType;
  featuredImage?: string;
  seo: { title?: string; description?: string; keywords?: string[] };
  status: 'draft' | 'published';
  showInMenu: boolean;

  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const pageSchema = new Schema<IPage>(
  {
    slug: { type: String, required: true, unique: true, lowercase: true },
    title: { type: String, required: true },
    content: { type: String, default: '' },
    type: { type: String, enum: Object.values(PageType), default: PageType.PAGE },
    featuredImage: String,
    seo: { title: String, description: String, keywords: [String] },
    status: { type: String, enum: ['draft', 'published'], default: 'draft' },
    showInMenu: { type: Boolean, default: false },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

pageSchema.index({ status: 1 });

pageSchema.plugin(tenantPlugin);

export const Page: Model<IPage> = mongoose.model<IPage>('Page', pageSchema);
