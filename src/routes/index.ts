import { Router } from 'express';
import authRoutes from './auth.routes';
import categoryRoutes from './category.routes';
import serviceRoutes from './service.routes';
import formRoutes from './form.routes';
import workflowRoutes from './workflow.routes';
import requestRoutes from './request.routes';
import queueRoutes from './queue.routes';
import appointmentRoutes from './appointment.routes';
import paymentRoutes from './payment.routes';
import notificationRoutes from './notification.routes';
import cmsRoutes from './cms.routes';
import dashboardRoutes from './dashboard.routes';
import userRoutes from './user.routes';
import lockerRoutes from './locker.routes';
import platformRoutes from './platform.routes';
import publicApplicationRoutes from './publicApplication.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/categories', categoryRoutes);
router.use('/services', serviceRoutes);
router.use('/forms', formRoutes);
router.use('/workflows', workflowRoutes);
router.use('/requests', requestRoutes);
router.use('/queue', queueRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/payments', paymentRoutes);
router.use('/notifications', notificationRoutes);
router.use('/cms', cmsRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/users', userRoutes);
router.use('/locker', lockerRoutes);
router.use('/platform', platformRoutes);
router.use('/public/application', publicApplicationRoutes);

// Future modules mount here as they're built (each in its own prompt/module):
// router.use('/customers', customerRoutes);

export default router;
