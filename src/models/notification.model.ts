import mongoose, { Schema, Document, Model } from 'mongoose';

export enum NotificationChannel {
  EMAIL = 'email',
  IN_APP = 'in_app',
}

export enum NotificationType {
  INFO = 'info',
  WARNING = 'warning',
  SUCCESS = 'success',
  ERROR = 'error',
  REMINDER = 'reminder',
}

export enum NotificationDeliveryStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
}

export interface INotification extends Document {
  user: mongoose.Types.ObjectId;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  message: string;
  data?: Record<string, unknown>;

  status: NotificationDeliveryStatus;
  readAt?: Date;
  sentAt?: Date;
  triggeredByEvent?: string;
  retryCount: number;
  error?: string;

  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: Object.values(NotificationType), default: NotificationType.INFO },
    channel: { type: String, enum: Object.values(NotificationChannel), required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    data: { type: Schema.Types.Mixed },

    status: { type: String, enum: Object.values(NotificationDeliveryStatus), default: NotificationDeliveryStatus.PENDING },
    readAt: Date,
    sentAt: Date,
    triggeredByEvent: String,
    retryCount: { type: Number, default: 0 },
    error: String,
  },
  { timestamps: true },
);

// ── Index strategy ──────────────────────────────────────────────────
// 1. The notification dropdown / bell icon — a user's own notifications, newest first.
notificationSchema.index({ user: 1, createdAt: -1 });
// 2. Unread count badge — partial-scan-friendly with status in the compound key.
notificationSchema.index({ user: 1, status: 1 });
// 3. Retry queue for failed email sends.
notificationSchema.index({ channel: 1, status: 1, retryCount: 1 });

export const Notification: Model<INotification> = mongoose.model<INotification>('Notification', notificationSchema);
