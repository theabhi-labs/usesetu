import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';
import { DashboardWidget } from '../models/dashboardWidget.model';
import { SavedReport } from '../models/savedReport.model';
import { Request as RequestModel } from '../models/request.model';
import {
  getKpiSummary,
  getRequestAnalytics,
  getCustomerAnalytics,
  getServiceAnalytics,
  getWorkflowAnalytics,
  getRevenueTrend,
} from '../services/analyticsEngine.service';
import { exportToExcel } from '../utils/excelExport';

export const getKpi = asyncHandler(async (_req: Request, res: Response) => {
  const summary = await getKpiSummary();
  res.status(200).json(new ApiResponse(200, summary));
});

export const getRequestAnalyticsHandler = asyncHandler(async (req: Request, res: Response) => {
  const { dateFrom, dateTo } = req.query as Record<string, string>;
  const analytics = await getRequestAnalytics(dateFrom, dateTo);
  res.status(200).json(new ApiResponse(200, analytics));
});

export const getCustomerAnalyticsHandler = asyncHandler(async (req: Request, res: Response) => {
  const { dateFrom, dateTo } = req.query as Record<string, string>;
  const analytics = await getCustomerAnalytics(dateFrom, dateTo);
  res.status(200).json(new ApiResponse(200, analytics));
});

export const getServiceAnalyticsHandler = asyncHandler(async (_req: Request, res: Response) => {
  const analytics = await getServiceAnalytics();
  res.status(200).json(new ApiResponse(200, analytics));
});

export const getWorkflowAnalyticsHandler = asyncHandler(async (req: Request, res: Response) => {
  const { workflow } = req.query as Record<string, string>;
  const analytics = await getWorkflowAnalytics(workflow);
  res.status(200).json(new ApiResponse(200, analytics));
});

export const getRevenueTrendHandler = asyncHandler(async (req: Request, res: Response) => {
  const { dateFrom, dateTo } = req.query as Record<string, string>;
  if (!dateFrom || !dateTo) throw ApiError.badRequest('dateFrom and dateTo are required');

  const trend = await getRevenueTrend(dateFrom, dateTo);
  res.status(200).json(new ApiResponse(200, trend));
});

export const getWidgets = asyncHandler(async (req: Request, res: Response) => {
  const layout = await DashboardWidget.findOneAndUpdate(
    { user: req.user!.userId },
    { $setOnInsert: { user: req.user!.userId } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  res.status(200).json(new ApiResponse(200, layout));
});

export const saveWidgets = asyncHandler(async (req: Request, res: Response) => {
  const layout = await DashboardWidget.findOneAndUpdate(
    { user: req.user!.userId },
    { widgets: req.body.widgets },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  res.status(200).json(new ApiResponse(200, layout, 'Dashboard layout saved'));
});

export const createSavedReport = asyncHandler(async (req: Request, res: Response) => {
  const report = await SavedReport.create({ ...req.body, createdBy: req.user!.userId });
  res.status(201).json(new ApiResponse(201, report, 'Report saved'));
});

export const getSavedReports = asyncHandler(async (req: Request, res: Response) => {
  const reports = await SavedReport.find({
    $or: [{ createdBy: req.user!.userId }, { isShared: true }],
  })
    .sort({ createdAt: -1 })
    .lean();
  res.status(200).json(new ApiResponse(200, reports));
});

export const deleteSavedReport = asyncHandler(async (req: Request, res: Response) => {
  const result = await SavedReport.findOneAndDelete({ _id: req.params.id, createdBy: req.user!.userId });
  if (!result) throw ApiError.notFound('Saved report not found');
  res.status(200).json(new ApiResponse(200, {}, 'Saved report deleted'));
});

// GET /api/v1/dashboard/export/requests  (Staff+ — streams an .xlsx file)
export const exportRequestsExcel = asyncHandler(async (req: Request, res: Response) => {
  const { dateFrom, dateTo, status, service } = req.query as Record<string, string>;

  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (service) filter.service = service;
  if (dateFrom || dateTo) {
    filter.createdAt = {
      ...(dateFrom ? { $gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { $lte: new Date(dateTo) } : {}),
    };
  }

  // .lean() + explicit projection — this can be a large export, so we avoid
  // hydrating full Mongoose documents for rows that only get serialized to
  // Excel cells.
  const requests = await RequestModel.find(filter)
    .select('applicationNumber customerName customerMobile status priority currentStage paymentSummary createdAt completedOn')
    .sort({ createdAt: -1 })
    .lean();

  await exportToExcel(
    res,
    `requests-export-${new Date().toISOString().split('T')[0]}`,
    [
      { header: 'Application Number', key: 'applicationNumber', width: 22 },
      { header: 'Customer', key: 'customerName', width: 20 },
      { header: 'Mobile', key: 'customerMobile', width: 14 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Priority', key: 'priority', width: 12 },
      { header: 'Current Stage', key: 'currentStage', width: 18 },
      { header: 'Paid Amount', key: 'paidAmount', width: 14 },
      { header: 'Created At', key: 'createdAt', width: 20 },
      { header: 'Completed At', key: 'completedOn', width: 20 },
    ],
    requests.map((r) => ({
      applicationNumber: r.applicationNumber,
      customerName: r.customerName,
      customerMobile: r.customerMobile,
      status: r.status,
      priority: r.priority,
      currentStage: r.currentStage,
      paidAmount: r.paymentSummary?.paidAmount || 0,
      createdAt: r.createdAt?.toISOString(),
      completedOn: r.completedOn?.toISOString() || '',
    })),
  );
});
