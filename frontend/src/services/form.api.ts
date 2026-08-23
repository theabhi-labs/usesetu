import { api } from '../lib/api';
import type { ApiResponse } from '../types/auth.types';
import type { Form, SubmitFormResponse } from '../types/form.types';

export const formApi = {
  getAll: async (page = 1, limit = 10, filters = {}): Promise<any> => {
    const res = await api.get<ApiResponse<any>>('/forms', { params: { page, limit, ...filters } });
    return res.data.data;
  },

  getPublicBySlug: async (slug: string): Promise<Form> => {
    const res = await api.get<ApiResponse<Form>>(`/forms/public/${slug}`);
    return res.data.data;
  },

  submitPublicForm: async (slug: string, values: Record<string, unknown>): Promise<SubmitFormResponse> => {
    const res = await api.post<ApiResponse<SubmitFormResponse>>(`/forms/public/${slug}/submit`, { values });
    return res.data.data;
  },

  getSubmissions: async (id: string, page = 1, limit = 10): Promise<any> => {
    const res = await api.get<ApiResponse<any>>(`/forms/${id}/submissions`, { params: { page, limit } });
    return res.data.data;
  },

  getById: async (id: string): Promise<Form> => {
    const res = await api.get<ApiResponse<Form>>(`/forms/${id}`);
    return res.data.data;
  },

  create: async (data: Partial<Form>): Promise<Form> => {
    const res = await api.post<ApiResponse<Form>>('/forms', data);
    return res.data.data;
  },

  update: async (id: string, data: Partial<Form>): Promise<Form> => {
    const res = await api.put<ApiResponse<Form>>(`/forms/${id}`, data);
    return res.data.data;
  },

  publish: async (id: string): Promise<Form> => {
    const res = await api.patch<ApiResponse<Form>>(`/forms/${id}/publish`);
    return res.data.data;
  },

  clone: async (id: string): Promise<Form> => {
    const res = await api.post<ApiResponse<Form>>(`/forms/${id}/clone`);
    return res.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/forms/${id}`);
  },
};
