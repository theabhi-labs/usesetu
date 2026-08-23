import { api } from '../lib/api';
import type { ApiResponse } from '../types/auth.types';
import type { Category } from '../types/category.types';

export const categoryApi = {
  getAll: async (page = 1, limit = 100, filters = {}): Promise<any> => {
    const res = await api.get<ApiResponse<any>>('/categories', { params: { page, limit, ...filters } });
    return res.data.data;
  },

  getPublic: async (): Promise<Category[]> => {
    const res = await api.get<ApiResponse<Category[]>>('/categories/public');
    return res.data.data;
  },

  create: async (data: FormData): Promise<Category> => {
    const res = await api.post<ApiResponse<Category>>('/categories', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
  },

  update: async (id: string, data: FormData): Promise<Category> => {
    const res = await api.put<ApiResponse<Category>>(`/categories/${id}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/categories/${id}`);
  },

  reorder: async (ids: string[]): Promise<void> => {
    await api.patch('/categories/reorder', { ids });
  },
};
