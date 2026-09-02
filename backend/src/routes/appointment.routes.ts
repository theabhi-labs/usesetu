import { Router } from 'express';
import {
  upsertSettings,
  getSettings,
  getAvailableSlots,
  bookAppointment,
  getMyAppointments,
  listAppointments,
  updateStatus,
  rescheduleAppointment,
  cancelAppointment,
} from '../controllers/appointment.controller';
import { isAuthenticated } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/rbac.middleware';
import { validate } from '../middlewares/validate.middleware';
import { Role } from '../types/auth.types';
import {
  upsertAppointmentSettingsSchema,
  getSlotsSchema,
  bookAppointmentSchema,
  appointmentIdParamSchema,
  updateAppointmentStatusSchema,
  rescheduleAppointmentSchema,
} from '../validators/queueAppointment.validator';

const router = Router();

// Public — anyone can check availability before logging in to book
router.get('/slots', validate(getSlotsSchema), getAvailableSlots);

router.use(isAuthenticated);

router.post('/', validate(bookAppointmentSchema), bookAppointment);
router.get('/my', getMyAppointments);
router.patch('/:id/reschedule', validate(rescheduleAppointmentSchema), rescheduleAppointment);
router.patch('/:id/cancel', validate(appointmentIdParamSchema), cancelAppointment);

router.use(authorizeRoles(Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF));

router.post('/settings', validate(upsertAppointmentSettingsSchema), upsertSettings);
router.get('/settings/:service', getSettings);
router.get('/', listAppointments);
router.patch('/:id/status', validate(updateAppointmentStatusSchema), updateStatus);

export default router;
