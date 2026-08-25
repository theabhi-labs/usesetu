import { Router } from 'express';
import { isAuthenticated } from '../middlewares/auth.middleware';
import {
  getTemplates,
  getPlans,
  getApplications,
  getApplicationDetail,
  createApplication,
  checkSlugAvailability,
  getApplicationDomain,
  addCustomDomain,
  verifyApplicationDomain,
  setPrimaryDomain,
  deleteApplicationDomain,
  getApplicationDomainStatus,
  getApplicationSubscription,
  changeApplicationPlan,
  cancelApplicationSubscription,
  getApplicationUsage,
  getPlatformDashboard,
  getPlatformBilling,
  getApplicationSettings,
  updateApplicationSettings,
  suspendApplication,
  resumeApplication,
  archiveApplication,
  getAccountProfile,
  updateAccountProfile,
  getAccountSecurity,
  getPlatformNotifications,
  markPlatformNotificationRead,
  markAllPlatformNotificationsRead,
} from '../controllers/platform.controller';

const router = Router();

// Publicly list plans or check slug availability
router.get('/plans', getPlans);
router.get('/applications/slug/:slug/availability', checkSlugAvailability);
router.get('/slug-availability', checkSlugAvailability);

// Secure all platform routes
router.use(isAuthenticated);

// Platform Overview & Dashboard
router.get('/dashboard', getPlatformDashboard);
router.get('/billing', getPlatformBilling);
router.get('/templates', getTemplates);

// Account & Security
router.get('/account', getAccountProfile);
router.patch('/account', updateAccountProfile);
router.get('/account/security', getAccountSecurity);

// Platform Notifications
router.get('/notifications', getPlatformNotifications);
router.patch('/notifications/read-all', markAllPlatformNotificationsRead);
router.patch('/notifications/:id/read', markPlatformNotificationRead);

// Applications Collection
router.get('/applications', getApplications);
router.post('/applications', createApplication);
router.get('/applications/:id', getApplicationDetail);

// Application Settings & Lifecycle
router.get('/applications/:id/settings', getApplicationSettings);
router.patch('/applications/:id/settings', updateApplicationSettings);
router.post('/applications/:id/suspend', suspendApplication);
router.post('/applications/:id/resume', resumeApplication);
router.post('/applications/:id/archive', archiveApplication);

// Domain Management endpoints
router.get('/applications/:id/domain', getApplicationDomain);
router.get('/applications/:id/domains', getApplicationDomain);
router.post('/applications/:id/domains', addCustomDomain);
router.post('/applications/:id/domains/:domainId/verify', verifyApplicationDomain);
router.post('/applications/:id/domains/:domainId/set-primary', setPrimaryDomain);
router.delete('/applications/:id/domains/:domainId', deleteApplicationDomain);
router.get('/applications/:id/domains/:domainId/status', getApplicationDomainStatus);

// Subscription & Usage endpoints
router.get('/applications/:id/subscription', getApplicationSubscription);
router.post('/applications/:id/subscription/change-plan', changeApplicationPlan);
router.post('/applications/:id/subscription/cancel', cancelApplicationSubscription);
router.get('/applications/:id/usage', getApplicationUsage);

export default router;
