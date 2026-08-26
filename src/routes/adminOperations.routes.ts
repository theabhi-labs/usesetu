import { Router } from 'express';
import { isAuthenticated } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/rbac.middleware';
import { Role } from '../types/auth.types';
import {
  getOperationsOverview,
  getPerformanceMetrics,
  getIncidents,
  getIncidentDetail,
  acknowledgeIncident,
  resolveIncident,
  ignoreIncident,
  getTrackedErrors,
  getErrorDetail,
  resolveTrackedError,
  getJobHistory,
  getBillingHealthSummary,
  getDomainHealthSummary,
  getApplicationHealthSummary,
  getSecurityEvents,
} from '../controllers/adminOperations.controller';

const router = Router();

// Enforce authentication and strictly SUPER_ADMIN authorization on all operations endpoints
router.use(isAuthenticated, authorizeRoles(Role.SUPER_ADMIN));

// Operations Telemetry & Health
router.get('/overview', getOperationsOverview);
router.get('/metrics', getPerformanceMetrics);
router.get('/billing-health', getBillingHealthSummary);
router.get('/domain-health', getDomainHealthSummary);
router.get('/application-health', getApplicationHealthSummary);

// Incidents Management
router.get('/incidents', getIncidents);
router.get('/incidents/:id', getIncidentDetail);
router.patch('/incidents/:id/acknowledge', acknowledgeIncident);
router.patch('/incidents/:id/resolve', resolveIncident);
router.patch('/incidents/:id/ignore', ignoreIncident);

// Errors Tracking
router.get('/errors', getTrackedErrors);
router.get('/errors/:id', getErrorDetail);
router.patch('/errors/:id/resolve', resolveTrackedError);

// Background Jobs
router.get('/jobs', getJobHistory);

// Security & Audit Events
router.get('/security-events', getSecurityEvents);

export default router;
