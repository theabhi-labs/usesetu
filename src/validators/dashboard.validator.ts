import { z } from 'zod';
import { ReportType } from '../models/savedReport.model';

export const dateRangeQuerySchema = z.object({
  query: z.object({
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
  }),
});

export const workflowAnalyticsQuerySchema = z.object({
  query: z.object({
    workflow: z.string().optional(),
  }),
});

export const saveWidgetsSchema = z.object({
  body: z.object({
    widgets: z.array(
      z.object({
        widgetKey: z.string().min(1),
        position: z.object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() }),
        isVisible: z.boolean().optional(),
        refreshIntervalSeconds: z.number().optional(),
      }),
    ),
  }),
});

export const createSavedReportSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(150),
    reportType: z.nativeEnum(ReportType),
    filters: z.record(z.string(), z.unknown()).optional(),
    columns: z.array(z.string()).optional(),
    groupBy: z.string().optional(),
    sortBy: z.string().optional(),
    isShared: z.boolean().optional(),
  }),
});

export const reportIdParamSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const exportQuerySchema = z.object({
  query: z.object({
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    status: z.string().optional(),
    service: z.string().optional(),
  }),
});
