import { tenantPlugin } from '../utils/tenantPlugin';
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface INotificationTemplate extends Document {
  key: string;
  channel: 'email' | 'in_app';
  subject?: string;
  bodyTemplate: string;
  variables: string[];
  isActive: boolean;

  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const notificationTemplateSchema = new Schema<INotificationTemplate>(
  {
    key: { type: String, required: true, unique: true },
    channel: { type: String, enum: ['email', 'in_app'], required: true },
    subject: String,
    bodyTemplate: { type: String, required: true },
    variables: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

notificationTemplateSchema.plugin(tenantPlugin);

export const NotificationTemplate: Model<INotificationTemplate> = mongoose.model<INotificationTemplate>(
  'NotificationTemplate',
  notificationTemplateSchema,
);
