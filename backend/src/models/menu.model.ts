import { tenantPlugin } from '../utils/tenantPlugin';
import mongoose, { Schema, Document, Model } from 'mongoose';

interface IMenuItem {
  key: string;
  label: string;
  url: string;
  icon?: string;
  parentKey?: string | null;
  order: number;
  openInNewTab: boolean;
  isActive: boolean;
}

export interface IMenu extends Document {
  location: 'header' | 'footer' | 'sidebar';
  items: IMenuItem[];
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const menuItemSchema = new Schema<IMenuItem>(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    url: { type: String, required: true },
    icon: String,
    parentKey: { type: String, default: null },
    order: { type: Number, default: 0 },
    openInNewTab: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { _id: false },
);

const menuSchema = new Schema<IMenu>(
  {
    location: { type: String, enum: ['header', 'footer', 'sidebar'], required: true, unique: true },
    items: { type: [menuItemSchema], default: [] },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

// One menu document per location — location already unique-indexed above.
menuSchema.plugin(tenantPlugin);

export const Menu: Model<IMenu> = mongoose.model<IMenu>('Menu', menuSchema);
