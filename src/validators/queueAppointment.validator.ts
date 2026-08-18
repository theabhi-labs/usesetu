import { z } from 'zod';
import { TokenPriority } from '../models/queueToken.model';
import { AppointmentStatus } from '../models/appointment.model';

// ── Queue ──────────────────────────────────────────────────────────
export const upsertQueueSchema = z.object({
  body: z.object({
    service: z.string().min(1),
    name: z.string().min(1).max(150),
    description: z.string().optional(),
    dailyLimit: z.number().min(0).optional(),
    tokenPrefix: z.string().min(1).max(6),
    priorityEnabled: z.boolean().optional(),
    estimatedServiceTimeMinutes: z.number().min(1).optional(),
    displayEnabled: z.boolean().optional(),
    status: z.enum(['active', 'inactive']).optional(),
    counters: z
      .array(
        z.object({
          key: z.string().min(1),
          name: z.string().min(1),
          status: z.enum(['active', 'inactive']).optional(),
        }),
      )
      .optional(),
    rules: z
      .object({
        maxWaitingMinutes: z.number().min(0).optional(),
        autoSkipAfterCalls: z.number().min(0).optional(),
        autoCloseTime: z.string().optional(),
        autoResetDaily: z.boolean().optional(),
      })
      .optional(),
  }),
});

export const generateTokenSchema = z.object({
  body: z.object({
    service: z.string().min(1),
    priority: z.nativeEnum(TokenPriority).optional(),
    request: z.string().optional(),
  }),
});

export const tokenIdParamSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const callNextSchema = z.object({
  body: z.object({
    service: z.string().min(1),
    counter: z.string().min(1),
  }),
});

// ── Appointment ────────────────────────────────────────────────────
export const upsertAppointmentSettingsSchema = z.object({
  body: z.object({
    service: z.string().min(1),
    slotDurationMinutes: z.number().min(5).optional(),
    bufferMinutes: z.number().min(0).optional(),
    maxBookingsPerSlot: z.number().min(1).optional(),
    bookingWindowDays: z.number().min(1).optional(),
    cutOffHours: z.number().min(0).optional(),
    workingHours: z
      .array(
        z.object({
          dayOfWeek: z.number().min(0).max(6),
          isOpen: z.boolean().optional(),
          startTime: z.string(),
          endTime: z.string(),
        }),
      )
      .optional(),
    holidayDates: z.array(z.string()).optional(),
    blockedDates: z.array(z.string()).optional(),
    status: z.enum(['active', 'inactive']).optional(),
  }),
});

export const getSlotsSchema = z.object({
  query: z.object({
    service: z.string().min(1),
    date: z.string().min(1),
  }),
});

export const bookAppointmentSchema = z.object({
  body: z.object({
    service: z.string().min(1),
    appointmentDate: z.string().min(1),
    slotStart: z.string().min(1),
    request: z.string().optional(),
  }),
});

export const appointmentIdParamSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const updateAppointmentStatusSchema = z.object({
  body: z.object({
    status: z.nativeEnum(AppointmentStatus),
    remarks: z.string().optional(),
  }),
  params: z.object({ id: z.string().min(1) }),
});

export const rescheduleAppointmentSchema = z.object({
  body: z.object({
    appointmentDate: z.string().min(1),
    slotStart: z.string().min(1),
  }),
  params: z.object({ id: z.string().min(1) }),
});
