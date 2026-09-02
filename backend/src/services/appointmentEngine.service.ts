import { IAppointmentSettings } from '../models/appointmentSettings.model';
import { ApiError } from '../utils/ApiError';

export interface SlotAvailability {
  start: string; // 'HH:mm'
  end: string;
  capacity: number;
  booked: number;
  available: number;
}

const toMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

const toHHMM = (minutes: number): string => {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
};

/**
 * Generates every slot for a given date from the service's working-hours
 * config, then overlays booking counts so the caller can see remaining
 * capacity per slot in a single pass - no per-slot database round trip.
 */
export const generateSlotsForDate = (
  settings: IAppointmentSettings,
  dateStr: string,
  bookedCountBySlotStart: Map<string, number>,
): SlotAvailability[] => {
  const dayOfWeek = new Date(`${dateStr}T00:00:00`).getDay();
  const dayConfig = settings.workingHours.find((w) => w.dayOfWeek === dayOfWeek);
  if (!dayConfig || !dayConfig.isOpen) return [];

  const slots: SlotAvailability[] = [];
  const stepMinutes = settings.slotDurationMinutes + settings.bufferMinutes;
  let cursor = toMinutes(dayConfig.startTime);
  const end = toMinutes(dayConfig.endTime);

  while (cursor + settings.slotDurationMinutes <= end) {
    const slotStart = toHHMM(cursor);
    const slotEnd = toHHMM(cursor + settings.slotDurationMinutes);
    const booked = bookedCountBySlotStart.get(slotStart) || 0;

    slots.push({
      start: slotStart,
      end: slotEnd,
      capacity: settings.maxBookingsPerSlot,
      booked,
      available: Math.max(0, settings.maxBookingsPerSlot - booked),
    });

    cursor += stepMinutes;
  }

  return slots;
};

/**
 * Validates a date is bookable at all: not a holiday, not blocked, within
 * the configured booking window, and not in the past.
 */
export const assertDateIsBookable = (settings: IAppointmentSettings, dateStr: string): void => {
  if (settings.holidayDates.includes(dateStr)) {
    throw ApiError.badRequest('This date is a holiday and not available for booking');
  }
  if (settings.blockedDates.includes(dateStr)) {
    throw ApiError.badRequest('This date is closed for bookings');
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${dateStr}T00:00:00`);
  if (target < today) {
    throw ApiError.badRequest('Cannot book an appointment in the past');
  }

  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + settings.bookingWindowDays);
  if (target > maxDate) {
    throw ApiError.badRequest(`Bookings are only open up to ${settings.bookingWindowDays} days in advance`);
  }
};

/**
 * Enforces the cancellation/reschedule cut-off: once the appointment is
 * within `cutOffHours` of its slot, it can no longer be changed by the customer.
 */
export const assertWithinCutoff = (settings: IAppointmentSettings, dateStr: string, slotStart: string): void => {
  const slotDateTime = new Date(`${dateStr}T${slotStart}:00`);
  const cutoffThreshold = new Date(Date.now() + settings.cutOffHours * 60 * 60 * 1000);
  if (slotDateTime < cutoffThreshold) {
    throw ApiError.badRequest(
      `This appointment can no longer be changed — cancellations must be made at least ${settings.cutOffHours} hour(s) in advance`,
    );
  }
};
