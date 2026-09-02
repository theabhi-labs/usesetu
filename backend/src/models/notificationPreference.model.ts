import { tenantPlugin } from '../utils/tenantPlugin';
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface INotificationPreference extends Document {
  user: mongoose.Types.ObjectId;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  smsEnabled: boolean;
  whatsappEnabled: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const notificationPreferenceSchema = new Schema<INotificationPreference>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    emailEnabled: { type: Boolean, default: true },
    inAppEnabled: { type: Boolean, default: true },
    smsEnabled: { type: Boolean, default: false },
    whatsappEnabled: { type: Boolean, default: false },
  },
  { timestamps: true },
);

notificationPreferenceSchema.plugin(tenantPlugin);

export const NotificationPreference: Model<INotificationPreference> = mongoose.model<INotificationPreference>(
  'NotificationPreference',
  notificationPreferenceSchema,
);
