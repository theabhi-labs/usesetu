import { tenantPlugin } from '../utils/tenantPlugin';
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  slug: string;
  parent: mongoose.Types.ObjectId | null;

  icon?: string;
  banner?: {
    url: string;
    fileId: string;
  };
  themeColor?: string;
  description?: string;

  seo: {
    title?: string;
    description?: string;
    keywords?: string[];
  };

  sortOrder: number;
  isActive: boolean;
  showOnHomepage: boolean;
  isFeatured: boolean;

  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true, maxlength: 150 },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    parent: { type: Schema.Types.ObjectId, ref: 'Category', default: null, index: true },

    icon: { type: String },
    banner: {
      url: { type: String },
      fileId: { type: String },
    },
    themeColor: { type: String, default: '#FF6700' },
    description: { type: String, maxlength: 2000 },

    seo: {
      title: { type: String },
      description: { type: String },
      keywords: [{ type: String }],
    },

    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    showOnHomepage: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

categorySchema.index({ parent: 1, sortOrder: 1 });
categorySchema.index({ isActive: 1, showOnHomepage: 1 });
categorySchema.index({ name: 'text', description: 'text' });

// Prevent a category from being its own parent, and guard against basic cycles
categorySchema.pre('save', async function (next) {
  if (this.parent && this.parent.equals(this._id as mongoose.Types.ObjectId)) {
    return next(new Error('A category cannot be its own parent'));
  }
  next();
});

categorySchema.plugin(tenantPlugin);

export const Category: Model<ICategory> = mongoose.model<ICategory>('Category', categorySchema);
