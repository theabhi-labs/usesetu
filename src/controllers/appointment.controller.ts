import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';
import { AppointmentSettings } from '../models/appointmentSettings.model';
import { Appointment, AppointmentStatus } from '../models/appointment.model';
import { generateSlotsForDate, assertDateIsBookable, assertWithinCutoff } from '../services/appointmentEngine.service';
import { Role } from '../types/auth.types';

// ---------------------------------------------------------------------------
// POST /api/v1/appointments/settings  (Admin — create or update)
// ---------------------------------------------------------------------------
export const upsertSettings = asyncHandler(async (req: Request, res: Response) => {
  const { service } = req.body;

  const settings = await AppointmentSettings.findOneAndUpdate(
    { service },
    { ...req.body, updatedBy: req.user!.userId, $setOnInsert: { createdBy: req.user!.userId } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  res.status(200).json(new ApiResponse(200, settings, 'Appointment settings saved'));
});

// ---------------------------------------------------------------------------
// GET /api/v1/appointments/settings/:service  (Admin)
// ---------------------------------------------------------------------------
export const getSettings = asyncHandler(async (req: Request, res: Response) => {
  const settings = await AppointmentSettings.findOne({ service: req.params.service });
  if (!settings) throw ApiError.notFound('No appointment settings configured for this service');
  res.status(200).json(new ApiResponse(200, settings));
});

// ---------------------------------------------------------------------------
// GET /api/v1/appointments/slots?service=xxx&date=YYYY-MM-DD  (Public/Customer)
// Cache candidate: key `appointments:slots:{service}:{date}`, TTL ~30s,
// invalidated on every booking/cancel for that service+date.
// ---------------------------------------------------------------------------
export const getAvailableSlots = asyncHandler(async (req: Request, res: Response) => {
  const { service, date } = req.query as Record<string, string>;

  const settings = await AppointmentSettings.findOne({ service, status: 'active' });
  if (!settings) throw ApiError.badRequest('Appointments are not configured or are inactive for this service');

  assertDateIsBookable(settings, date);

  // Single aggregation for booking counts per slot rather than one count
  // query per generated slot — flat regardless of how many slots exist.
  const bookingCounts = await Appointment.aggregate([
    {
      $match: {
        service: settings.service,
        appointmentDate: date,
        status: { $nin: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW] },
      },
    },
    { $group: { _id: '$slotStart', count: { $sum: 1 } } },
  ]);

  const bookedMap = new Map(bookingCounts.map((b) => [b._id, b.count]));
  const slots = generateSlotsForDate(settings, date, bookedMap);

  res.status(200).json(new ApiResponse(200, { date, slots }));
});

// ---------------------------------------------------------------------------
// POST /api/v1/appointments  (Customer — book)
// ---------------------------------------------------------------------------
export const bookAppointment = asyncHandler(async (req: Request, res: Response) => {
  const { service, appointmentDate, slotStart, request } = req.body;

  const settings = await AppointmentSettings.findOne({ service, status: 'active' });
  if (!settings) throw ApiError.badRequest('Appointments are not configured or are inactive for this service');

  assertDateIsBookable(settings, appointmentDate);

  const dayOfWeek = new Date(`${appointmentDate}T00:00:00`).getDay();
  const dayConfig = settings.workingHours.find((w) => w.dayOfWeek === dayOfWeek);
  if (!dayConfig || !dayConfig.isOpen) throw ApiError.badRequest('This service is closed on the selected day');

  const [h, m] = slotStart.split(':').map(Number);
  const slotEndMinutes = h * 60 + m + settings.slotDurationMinutes;
  const slotEnd = `${String(Math.floor(slotEndMinutes / 60)).padStart(2, '0')}:${String(slotEndMinutes % 60).padStart(2, '0')}`;

  // Atomic capacity check: count current bookings and only proceed if under
  // capacity. A race between two simultaneous bookings for the last slot is
  // still theoretically possible without a unique partial index; for CSC
  // scale (single center, human-paced booking) this is an acceptable
  // trade-off. Flagged here for the Redis/lock upgrade path at higher scale.
  const existingCount = await Appointment.countDocuments({
    service,
    appointmentDate,
    slotStart,
    status: { $nin: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW] },
  });
  if (existingCount >= settings.maxBookingsPerSlot) {
    throw ApiError.conflict('This slot is fully booked. Please choose another slot.');
  }

  const appointment = await Appointment.create({
    service,
    customer: req.user!.userId,
    request,
    appointmentDate,
    slotStart,
    slotEnd,
    status: AppointmentStatus.SCHEDULED,
    createdBy: req.user!.userId,
  });

  res.status(201).json(new ApiResponse(201, appointment, 'Appointment booked successfully'));
});

// ---------------------------------------------------------------------------
// GET /api/v1/appointments/my  (Customer)
// ---------------------------------------------------------------------------
export const getMyAppointments = asyncHandler(async (req: Request, res: Response) => {
  const appointments = await Appointment.find({ customer: req.user!.userId })
    .populate('service', 'name slug')
    .sort({ appointmentDate: -1 })
    .lean();

  res.status(200).json(new ApiResponse(200, appointments));
});

// ---------------------------------------------------------------------------
// GET /api/v1/appointments  (Admin — calendar/list view)
// ---------------------------------------------------------------------------
export const listAppointments = asyncHandler(async (req: Request, res: Response) => {
  const { service, date, status, page = '1', limit = '50' } = req.query as Record<string, string>;

  const filter: Record<string, unknown> = {};
  if (service) filter.service = service;
  if (date) filter.appointmentDate = date;
  if (status) filter.status = status;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));

  const [appointments, total] = await Promise.all([
    Appointment.find(filter)
      .populate('service', 'name slug')
      .populate('customer', 'name mobile')
      .sort({ appointmentDate: 1, slotStart: 1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    Appointment.countDocuments(filter),
  ]);

  res.status(200).json(
    new ApiResponse(200, {
      appointments,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    }),
  );
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/appointments/:id/status  (Admin — confirm/in-progress/completed/no-show)
// ---------------------------------------------------------------------------
export const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) throw ApiError.notFound('Appointment not found');

  appointment.status = req.body.status;
  if (req.body.remarks) appointment.remarks = req.body.remarks;
  await appointment.save();

  res.status(200).json(new ApiResponse(200, appointment, 'Appointment status updated'));
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/appointments/:id/reschedule  (Customer/Admin)
// ---------------------------------------------------------------------------
export const rescheduleAppointment = asyncHandler(async (req: Request, res: Response) => {
  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) throw ApiError.notFound('Appointment not found');

  const isCustomer = req.user!.role === Role.CUSTOMER;
  if (isCustomer && String(appointment.customer) !== req.user!.userId) {
    throw ApiError.forbidden('You do not have access to this appointment');
  }

  const settings = await AppointmentSettings.findOne({ service: appointment.service });
  if (!settings) throw ApiError.internal('Appointment settings no longer exist for this service');

  if (isCustomer) {
    assertWithinCutoff(settings, appointment.appointmentDate, appointment.slotStart);
  }

  const { appointmentDate, slotStart } = req.body;
  assertDateIsBookable(settings, appointmentDate);

  const existingCount = await Appointment.countDocuments({
    service: appointment.service,
    appointmentDate,
    slotStart,
    status: { $nin: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW] },
    _id: { $ne: appointment._id },
  });
  if (existingCount >= settings.maxBookingsPerSlot) {
    throw ApiError.conflict('This slot is fully booked. Please choose another slot.');
  }

  const [h, m] = slotStart.split(':').map(Number);
  const slotEndMinutes = h * 60 + m + settings.slotDurationMinutes;
  appointment.appointmentDate = appointmentDate;
  appointment.slotStart = slotStart;
  appointment.slotEnd = `${String(Math.floor(slotEndMinutes / 60)).padStart(2, '0')}:${String(slotEndMinutes % 60).padStart(2, '0')}`;
  appointment.status = AppointmentStatus.SCHEDULED;
  await appointment.save();

  res.status(200).json(new ApiResponse(200, appointment, 'Appointment rescheduled'));
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/appointments/:id/cancel  (Customer/Admin)
// ---------------------------------------------------------------------------
export const cancelAppointment = asyncHandler(async (req: Request, res: Response) => {
  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) throw ApiError.notFound('Appointment not found');

  const isCustomer = req.user!.role === Role.CUSTOMER;
  if (isCustomer && String(appointment.customer) !== req.user!.userId) {
    throw ApiError.forbidden('You do not have access to this appointment');
  }

  if (isCustomer) {
    const settings = await AppointmentSettings.findOne({ service: appointment.service });
    if (settings) assertWithinCutoff(settings, appointment.appointmentDate, appointment.slotStart);
  }

  appointment.status = AppointmentStatus.CANCELLED;
  appointment.cancelledAt = new Date();
  appointment.cancelledReason = req.body.reason;
  await appointment.save();

  res.status(200).json(new ApiResponse(200, appointment, 'Appointment cancelled'));
});
