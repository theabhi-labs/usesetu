import { api } from '../lib/api';
import type { ApiResponse } from '../types/auth.types';
import type { Workflow } from '../types/workflow.types';

export const workflowApi = {
  getAll: async (page = 1, limit = 10, filters = {}): Promise<any> => {
    const res = await api.get<ApiResponse<any>>('/workflows', { params: { page, limit, ...filters } });
    return res.data.data;
  },

  getTemplates: async (): Promise<any[]> => {
    const res = await api.get<ApiResponse<any[]>>('/workflows/templates');
    return res.data.data;
  },

  getById: async (id: string): Promise<Workflow> => {
    const res = await api.get<ApiResponse<Workflow>>(`/workflows/${id}`);
    return res.data.data;
  },

  create: async (data: Partial<Workflow>): Promise<Workflow> => {
    const res = await api.post<ApiResponse<Workflow>>('/workflows', data);
    return res.data.data;
  },

  update: async (id: string, data: Partial<Workflow>): Promise<Workflow> => {
    const res = await api.put<ApiResponse<Workflow>>(`/workflows/${id}`, data);
    return res.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/workflows/${id}`);
  },

  reorderStages: async (id: string, stageKeys: string[]): Promise<Workflow> => {
    const res = await api.patch<ApiResponse<Workflow>>(`/workflows/${id}/stages/reorder`, { stageKeys });
    return res.data.data;
  },

  publish: async (id: string): Promise<Workflow> => {
    const res = await api.patch<ApiResponse<Workflow>>(`/workflows/${id}/publish`);
    return res.data.data;
  },

  duplicate: async (id: string): Promise<Workflow> => {
    const res = await api.post<ApiResponse<Workflow>>(`/workflows/${id}/duplicate`);
    return res.data.data;
  },
};
