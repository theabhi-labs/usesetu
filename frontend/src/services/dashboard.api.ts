import { api } from '../lib/api';
import type { ApiResponse } from '../types/auth.types';

export const dashboardApi = {
  getKpi: async (): Promise<any> => {
    const res = await api.get<ApiResponse<any>>('/dashboard/kpi');
    return res.data.data;
  },

  getRequestAnalytics: async (): Promise<any> => {
    const res = await api.get<ApiResponse<any>>('/dashboard/analytics/requests');
    return res.data.data;
  },

  getServiceAnalytics: async (): Promise<any> => {
    const res = await api.get<ApiResponse<any>>('/dashboard/analytics/services');
    return res.data.data;
  },

  getWorkflowAnalytics: async (): Promise<any> => {
    const res = await api.get<ApiResponse<any>>('/dashboard/analytics/workflow');
    return res.data.data;
  },

  getRevenueTrend: async (dateFrom?: string, dateTo?: string): Promise<any> => {
    const res = await api.get<ApiResponse<any>>('/dashboard/analytics/revenue-trend', {
      params: { dateFrom, dateTo },
    });
    return res.data.data;
  },

  getWidgets: async (): Promise<any> => {
    const res = await api.get<ApiResponse<any>>('/dashboard/widgets');
    return res.data.data;
  },

  updateWidgets: async (layouts: any): Promise<any> => {
    const res = await api.put<ApiResponse<any>>('/dashboard/widgets', { layouts });
    return res.data.data;
  },

  getReports: async (): Promise<any> => {
    const res = await api.get<ApiResponse<any>>('/dashboard/reports');
    return res.data.data;
  },

  createReport: async (report: { title: string; filters: Record<string, unknown> }): Promise<any> => {
    const res = await api.post<ApiResponse<any>>('/dashboard/reports', report);
    return res.data.data;
  },

  deleteReport: async (id: string): Promise<void> => {
    await api.delete(`/dashboard/reports/${id}`);
  },
};
