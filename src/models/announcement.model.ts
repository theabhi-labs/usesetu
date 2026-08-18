import mongoose, { Schema, Document, Model } from 'mongoose';

export enum AnnouncementType {
  NOTICE = 'notice',
  HOLIDAY = 'holiday',
  NEW_SCHEME = 'new_scheme',
  PORTAL_DOWN = 'portal_down',
}

export interface IAnnouncement extends Document {
  title: string;
  content: string;
  type: AnnouncementType;
  startDate: Date;
  endDate?: Date;
  priority: number;
  isPinned: boolean;
  isActive: boolean;

  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const announcementSchema = new Schema<IAnnouncement>(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    type: { type: String, enum: Object.values(AnnouncementType), default: AnnouncementType.NOTICE },
    startDate: { type: Date, default: Date.now },
    endDate: Date,
    priority: { type: Number, default: 0 },
    isPinned: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

announcementSchema.index({ isActive: 1, startDate: 1, endDate: 1 });
announcementSchema.index({ isPinned: -1, priority: -1 });

export const Announcement: Model<IAnnouncement> = mongoose.model<IAnnouncement>('Announcement', announcementSchema);
