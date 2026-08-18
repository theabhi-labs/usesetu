import mongoose, { Schema, Document, Model } from 'mongoose';

interface IWorkingHours {
  dayOfWeek: number; // 0 = Sunday .. 6 = Saturday
  isOpen: boolean;
  startTime: string; // 'HH:mm'
  endTime: string;
}

export interface IAppointmentSettings extends Document {
  service: mongoose.Types.ObjectId;

  slotDurationMinutes: number;
  bufferMinutes: number; // gap between consecutive slots
  maxBookingsPerSlot: number;
  bookingWindowDays: number; // how far in advance a customer can book
  cutOffHours: number; // can't cancel/reschedule within this many hours of the slot

  workingHours: IWorkingHours[];
  holidayDates: string[]; // 'YYYY-MM-DD'
  blockedDates: string[]; // 'YYYY-MM-DD' — ad-hoc closures distinct from recurring holidays

  status: 'active' | 'inactive';

  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const workingHoursSchema = new Schema<IWorkingHours>(
  {
    dayOfWeek: { type: Number, min: 0, max: 6, required: true },
    isOpen: { type: Boolean, default: true },
    startTime: { type: String, default: '10:00' },
    endTime: { type: String, default: '17:00' },
  },
  { _id: false },
);

const appointmentSettingsSchema = new Schema<IAppointmentSettings>(
  {
    service: { type: Schema.Types.ObjectId, ref: 'Service', required: true, unique: true },

    slotDurationMinutes: { type: Number, default: 30, min: 5 },
    bufferMinutes: { type: Number, default: 0, min: 0 },
    maxBookingsPerSlot: { type: Number, default: 1, min: 1 },
    bookingWindowDays: { type: Number, default: 30, min: 1 },
    cutOffHours: { type: Number, default: 2, min: 0 },

    workingHours: {
      type: [workingHoursSchema],
      default: [1, 2, 3, 4, 5, 6].map((d) => ({ dayOfWeek: d, isOpen: true, startTime: '10:00', endTime: '17:00' })),
    },
    holidayDates: { type: [String], default: [] },
    blockedDates: { type: [String], default: [] },

    status: { type: String, enum: ['active', 'inactive'], default: 'active' },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export const AppointmentSettings: Model<IAppointmentSettings> = mongoose.model<IAppointmentSettings>(
  'AppointmentSettings',
  appointmentSettingsSchema,
);
