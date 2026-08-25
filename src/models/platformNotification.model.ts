import mongoose, { Schema, Document, Model } from 'mongoose';

export enum PlatformNotificationCategory {
  PROVISIONING = 'provisioning',
  SUBSCRIPTION = 'subscription',
  QUOTA = 'quota',
  DOMAIN = 'domain',
  STATUS = 'status',
  SYSTEM = 'system',
}

export enum PlatformNotificationType {
  INFO = 'info',
  WARNING = 'warning',
  SUCCESS = 'success',
  ERROR = 'error',
}

export interface IPlatformNotification extends Document {
  accountId: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  applicationId?: mongoose.Types.ObjectId;
  category: PlatformNotificationCategory;
  type: PlatformNotificationType;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  readAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const platformNotificationSchema = new Schema<IPlatformNotification>(
  {
    accountId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: 'Application',
      index: true,
    },
    category: {
      type: String,
      enum: Object.values(PlatformNotificationCategory),
      default: PlatformNotificationCategory.SYSTEM,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(PlatformNotificationType),
      default: PlatformNotificationType.INFO,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    link: {
      type: String,
      trim: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true },
);

platformNotificationSchema.index({ accountId: 1, isRead: 1, createdAt: -1 });

export const PlatformNotification: Model<IPlatformNotification> = mongoose.model<IPlatformNotification>(
  'PlatformNotification',
  platformNotificationSchema,
);
