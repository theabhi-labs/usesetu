import { tenantPlugin } from '../utils/tenantPlugin';
import mongoose, { Schema, Document, Model } from 'mongoose';

export enum AppointmentStatus {
  SCHEDULED = 'scheduled',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}

export interface IAppointment extends Document {
  service: mongoose.Types.ObjectId;
  customer: mongoose.Types.ObjectId;
  request?: mongoose.Types.ObjectId;

  appointmentDate: string; // 'YYYY-MM-DD'
  slotStart: string; // 'HH:mm'
  slotEnd: string;

  status: AppointmentStatus;
  assignedAdmin?: mongoose.Types.ObjectId;
  remarks?: string;
  reminderSent: boolean;

  cancelledAt?: Date;
  cancelledReason?: string;

  createdBy: mongoose.Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const appointmentSchema = new Schema<IAppointment>(
  {
    service: { type: Schema.Types.ObjectId, ref: 'Service', required: true },
    customer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    request: { type: Schema.Types.ObjectId, ref: 'Request' },

    appointmentDate: { type: String, required: true },
    slotStart: { type: String, required: true },
    slotEnd: { type: String, required: true },

    status: { type: String, enum: Object.values(AppointmentStatus), default: AppointmentStatus.SCHEDULED },
    assignedAdmin: { type: Schema.Types.ObjectId, ref: 'User' },
    remarks: String,
    reminderSent: { type: Boolean, default: false },

    cancelledAt: Date,
    cancelledReason: String,

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

// ── Index strategy ──────────────────────────────────────────────────
// 1. Slot-capacity check on every booking attempt — "how many bookings
//    already exist for service X on date Y at slot Z". This is the single
//    most frequent query in the module (runs on every availability check).
appointmentSchema.index({ service: 1, appointmentDate: 1, slotStart: 1, status: 1 });
// 2. Customer's own appointments.
appointmentSchema.index({ customer: 1, appointmentDate: -1 });
// 3. Admin day-view calendar.
appointmentSchema.index({ appointmentDate: 1, status: 1 });

appointmentSchema.plugin(tenantPlugin);

export const Appointment: Model<IAppointment> = mongoose.model<IAppointment>('Appointment', appointmentSchema);
