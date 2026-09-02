import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { DatabaseHealthService } from '../services/observability/databaseHealth.service';
import { MetricsService } from '../services/observability/metrics.service';
import { IncidentService } from '../services/observability/incident.service';
import { ErrorTrackerService } from '../services/observability/errorTracker.service';
import { JobMonitorService } from '../services/observability/jobMonitor.service';
import { BillingHealthService } from '../services/observability/billingHealth.service';
import { DomainHealthService } from '../services/observability/domainHealth.service';
import { ApplicationHealthService } from '../services/observability/applicationHealth.service';
import { SecurityAuditService } from '../services/observability/securityAudit.service';
import { SystemIncident } from '../models/systemIncident.model';
import { SystemError } from '../models/systemError.model';

// ---------------------------------------------------------------------------
// GET /api/v1/admin/operations/overview
// ---------------------------------------------------------------------------
export const getOperationsOverview = asyncHandler(async (_req: Request, res: Response) => {
  const [
    dbHealth,
    perfSummary,
    billingHealth,
    domainHealth,
    appHealth,
    openIncidentsCount,
    criticalErrorsCount,
  ] = await Promise.all([
    DatabaseHealthService.checkHealth(),
    MetricsService.getPerformanceSummary(),
    BillingHealthService.getBillingHealth(),
    DomainHealthService.getDomainHealth(),
    ApplicationHealthService.getApplicationHealth(),
    SystemIncident.countDocuments({ status: { $in: ['OPEN', 'ACKNOWLEDGED'] } }),
    SystemError.countDocuments({ status: 'UNRESOLVED', severity: { $in: ['P0', 'P1', 'ERROR'] } }),
  ]);

  const overview = {
    system: {
      status: dbHealth.status === 'critical' ? 'degraded' : 'operational',
      database: dbHealth,
      uptimeSeconds: perfSummary.uptimeSeconds,
      timestamp: new Date().toISOString(),
    },
    performance: {
      requestsPerMinute: perfSummary.requestsPerMinute,
      totalRequests: perfSummary.totalRequests,
      errorRatePercent: perfSummary.errorRatePercent,
      p50Ms: perfSummary.p50Ms,
      p95Ms: perfSummary.p95Ms,
      p99Ms: perfSummary.p99Ms,
    },
    incidents: {
      openCount: openIncidentsCount,
    },
    errors: {
      unresolvedCriticalCount: criticalErrorsCount,
    },
    billing: billingHealth.summary,
    webhooks: billingHealth.webhooks,
    subscriptions: billingHealth.subscriptions,
    domains: domainHealth.summary,
    applications: appHealth.summary,
  };

  res.status(200).json(new ApiResponse(200, overview, 'Operations overview fetched successfully'));
});

// ---------------------------------------------------------------------------
// GET /api/v1/admin/operations/metrics
// ---------------------------------------------------------------------------
export const getPerformanceMetrics = asyncHandler(async (_req: Request, res: Response) => {
  const metrics = MetricsService.getPerformanceSummary();
  res.status(200).json(new ApiResponse(200, metrics, 'Performance metrics fetched successfully'));
});

// ---------------------------------------------------------------------------
// GET /api/v1/admin/operations/incidents
// ---------------------------------------------------------------------------
export const getIncidents = asyncHandler(async (req: Request, res: Response) => {
  const result = await IncidentService.getIncidents(req.query as any);
  res.status(200).json(new ApiResponse(200, result, 'Incidents fetched successfully'));
});

// ---------------------------------------------------------------------------
// GET /api/v1/admin/operations/incidents/:id
// ---------------------------------------------------------------------------
export const getIncidentDetail = asyncHandler(async (req: Request, res: Response) => {
  const incident = await SystemIncident.findById(req.params.id);
  if (!incident) {
    throw ApiError.notFound('Incident not found');
  }
  res.status(200).json(new ApiResponse(200, incident, 'Incident fetched successfully'));
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/admin/operations/incidents/:id/acknowledge
// ---------------------------------------------------------------------------
export const acknowledgeIncident = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const incident = await IncidentService.acknowledgeIncident(req.params.id, userId);
  if (!incident) {
    throw ApiError.notFound('Incident not found');
  }
  res.status(200).json(new ApiResponse(200, incident, 'Incident acknowledged'));
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/admin/operations/incidents/:id/resolve
// ---------------------------------------------------------------------------
export const resolveIncident = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const incident = await IncidentService.resolveIncident(req.params.id, userId);
  if (!incident) {
    throw ApiError.notFound('Incident not found');
  }
  res.status(200).json(new ApiResponse(200, incident, 'Incident resolved'));
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/admin/operations/incidents/:id/ignore
// ---------------------------------------------------------------------------
export const ignoreIncident = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const incident = await IncidentService.ignoreIncident(req.params.id, userId);
  if (!incident) {
    throw ApiError.notFound('Incident not found');
  }
  res.status(200).json(new ApiResponse(200, incident, 'Incident marked as ignored'));
});

// ---------------------------------------------------------------------------
// GET /api/v1/admin/operations/errors
// ---------------------------------------------------------------------------
export const getTrackedErrors = asyncHandler(async (req: Request, res: Response) => {
  const result = await ErrorTrackerService.getErrors(req.query as any);
  res.status(200).json(new ApiResponse(200, result, 'Errors fetched successfully'));
});

// ---------------------------------------------------------------------------
// GET /api/v1/admin/operations/errors/:id
// ---------------------------------------------------------------------------
export const getErrorDetail = asyncHandler(async (req: Request, res: Response) => {
  const error = await SystemError.findById(req.params.id);
  if (!error) {
    throw ApiError.notFound('Error record not found');
  }
  res.status(200).json(new ApiResponse(200, error, 'Error detail fetched successfully'));
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/admin/operations/errors/:id/resolve
// ---------------------------------------------------------------------------
export const resolveTrackedError = asyncHandler(async (req: Request, res: Response) => {
  const error = await ErrorTrackerService.resolveError(req.params.id);
  if (!error) {
    throw ApiError.notFound('Error record not found');
  }
  res.status(200).json(new ApiResponse(200, error, 'Error marked as resolved'));
});

// ---------------------------------------------------------------------------
// GET /api/v1/admin/operations/jobs
// ---------------------------------------------------------------------------
export const getJobHistory = asyncHandler(async (req: Request, res: Response) => {
  const result = await JobMonitorService.getJobHistory(req.query as any);
  res.status(200).json(new ApiResponse(200, result, 'Job history fetched successfully'));
});

// ---------------------------------------------------------------------------
// GET /api/v1/admin/operations/billing-health
// ---------------------------------------------------------------------------
export const getBillingHealthSummary = asyncHandler(async (_req: Request, res: Response) => {
  const health = await BillingHealthService.getBillingHealth();
  res.status(200).json(new ApiResponse(200, health, 'Billing health fetched successfully'));
});

// ---------------------------------------------------------------------------
// GET /api/v1/admin/operations/domain-health
// ---------------------------------------------------------------------------
export const getDomainHealthSummary = asyncHandler(async (_req: Request, res: Response) => {
  const health = await DomainHealthService.getDomainHealth();
  res.status(200).json(new ApiResponse(200, health, 'Domain health fetched successfully'));
});

// ---------------------------------------------------------------------------
// GET /api/v1/admin/operations/application-health
// ---------------------------------------------------------------------------
export const getApplicationHealthSummary = asyncHandler(async (_req: Request, res: Response) => {
  const health = await ApplicationHealthService.getApplicationHealth();
  res.status(200).json(new ApiResponse(200, health, 'Application health fetched successfully'));
});

// ---------------------------------------------------------------------------
// GET /api/v1/admin/operations/security-events
// ---------------------------------------------------------------------------
export const getSecurityEvents = asyncHandler(async (req: Request, res: Response) => {
  const result = await SecurityAuditService.getEvents(req.query as any);
  res.status(200).json(new ApiResponse(200, result, 'Security events fetched successfully'));
});
