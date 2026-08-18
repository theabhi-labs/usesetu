import mongoose, { Schema, Document, Model } from 'mongoose';

export enum ReminderStatus {
  PENDING = 'pending',
  SENT = 'sent',
  CANCELLED = 'cancelled',
}

export interface IReminder extends Document {
  targetType: 'request' | 'appointment' | 'document';
  targetId: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  message: string;
  scheduledFor: Date;
  status: ReminderStatus;
  sentAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const reminderSchema = new Schema<IReminder>(
  {
    targetType: { type: String, enum: ['request', 'appointment', 'document'], required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true },
    scheduledFor: { type: Date, required: true },
    status: { type: String, enum: Object.values(ReminderStatus), default: ReminderStatus.PENDING },
    sentAt: Date,
  },
  { timestamps: true },
);

// The scheduler's hot query: "every pending reminder due now or earlier".
reminderSchema.index({ status: 1, scheduledFor: 1 });

export const Reminder: Model<IReminder> = mongoose.model<IReminder>('Reminder', reminderSchema);
