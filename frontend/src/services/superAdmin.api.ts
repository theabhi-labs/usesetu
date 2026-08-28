import { api } from '../lib/api';
import type {
  SuperAdminOverview,
  SuperAdminTenantsResponse,
  SuperAdminTenantDetails,
  SuperAdminRequestsWatchdog,
  SuperAdminRevenueResponse,
  SuperAdminPlanItem,
} from '../types/superAdmin.types';

export const superAdminApi = {
  // 1. Global Overview
  getOverview: async (): Promise<SuperAdminOverview> => {
    const response = await api.get('/platform/super-admin/overview');
    return response.data.data;
  },

  // 2. Tenants Directory
  getTenants: async (params?: { page?: number; limit?: number; search?: string; status?: string }): Promise<SuperAdminTenantsResponse> => {
    const response = await api.get('/platform/super-admin/tenants', { params });
    return response.data.data;
  },

  // 3. Tenant Details
  getTenantDetails: async (id: string): Promise<SuperAdminTenantDetails> => {
    const response = await api.get(`/platform/super-admin/tenants/${id}`);
    return response.data.data;
  },

  // 4. Request Watchdog
  getRequestsWatchdog: async (): Promise<SuperAdminRequestsWatchdog> => {
    const response = await api.get('/platform/super-admin/requests');
    return response.data.data;
  },

  // 5. Revenue & Financials
  getRevenue: async (): Promise<SuperAdminRevenueResponse> => {
    const response = await api.get('/platform/super-admin/revenue');
    return response.data.data;
  },

  // 6. Plans Management
  getPlans: async (): Promise<SuperAdminPlanItem[]> => {
    const response = await api.get('/platform/super-admin/plans');
    return response.data.data;
  },

  createPlan: async (payload: any): Promise<SuperAdminPlanItem> => {
    const response = await api.post('/platform/super-admin/plans', payload);
    return response.data.data;
  },

  updatePlan: async (id: string, payload: any): Promise<SuperAdminPlanItem> => {
    const response = await api.patch(`/platform/super-admin/plans/${id}`, payload);
    return response.data.data;
  },
};
