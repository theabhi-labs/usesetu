import { Router } from 'express';
import {
  getKpi,
  getRequestAnalyticsHandler,
  getCustomerAnalyticsHandler,
  getServiceAnalyticsHandler,
  getWorkflowAnalyticsHandler,
  getRevenueTrendHandler,
  getWidgets,
  saveWidgets,
  createSavedReport,
  getSavedReports,
  deleteSavedReport,
  exportRequestsExcel,
} from '../controllers/dashboard.controller';
import { isAuthenticated } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/rbac.middleware';
import { validate } from '../middlewares/validate.middleware';
import { Role } from '../types/auth.types';
import {
  dateRangeQuerySchema,
  workflowAnalyticsQuerySchema,
  saveWidgetsSchema,
  createSavedReportSchema,
  reportIdParamSchema,
  exportQuerySchema,
} from '../validators/dashboard.validator';

const router = Router();

router.use(isAuthenticated, authorizeRoles(Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF));

router.get('/kpi', getKpi);
router.get('/analytics/requests', validate(dateRangeQuerySchema), getRequestAnalyticsHandler);
router.get('/analytics/customers', validate(dateRangeQuerySchema), getCustomerAnalyticsHandler);
router.get('/analytics/services', getServiceAnalyticsHandler);
router.get('/analytics/workflow', validate(workflowAnalyticsQuerySchema), getWorkflowAnalyticsHandler);
router.get('/analytics/revenue-trend', validate(dateRangeQuerySchema), getRevenueTrendHandler);

router.get('/widgets', getWidgets);
router.put('/widgets', validate(saveWidgetsSchema), saveWidgets);

router.post('/reports', validate(createSavedReportSchema), createSavedReport);
router.get('/reports', getSavedReports);
router.delete('/reports/:id', validate(reportIdParamSchema), deleteSavedReport);

router.get('/export/requests', validate(exportQuerySchema), exportRequestsExcel);

export default router;
