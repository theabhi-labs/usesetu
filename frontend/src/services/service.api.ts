import { api } from '../lib/api';
import type { ApiResponse } from '../types/auth.types';
import type { Service, PublicServiceDTO } from '../types/service.types';

export const serviceApi = {
  getAll: async (page = 1, limit = 10, filters = {}): Promise<any> => {
    const res = await api.get<ApiResponse<any>>('/services', { params: { page, limit, ...filters } });
    return res.data.data;
  },

  getPublic: async (filters = {}): Promise<PublicServiceDTO[]> => {
    const res = await api.get<ApiResponse<PublicServiceDTO[]>>('/services/public', { params: filters });
    return res.data.data;
  },

  getFeatured: async (): Promise<PublicServiceDTO[]> => {
    const res = await api.get<ApiResponse<PublicServiceDTO[]>>('/services/featured');
    return res.data.data;
  },

  getPublicBySlug: async (slug: string): Promise<PublicServiceDTO> => {
    const res = await api.get<ApiResponse<PublicServiceDTO>>(`/services/public/${slug}`);
    return res.data.data;
  },

  create: async (data: Partial<Service>): Promise<Service> => {
    const res = await api.post<ApiResponse<Service>>('/services', data);
    return res.data.data;
  },

  update: async (id: string, data: Partial<Service>): Promise<Service> => {
    const res = await api.put<ApiResponse<Service>>(`/services/${id}`, data);
    return res.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/services/${id}`);
  },

  toggleStatus: async (id: string): Promise<Service> => {
    const res = await api.patch<ApiResponse<Service>>(`/services/${id}/status`);
    return res.data.data;
  },

  toggleFeatured: async (id: string): Promise<Service> => {
    const res = await api.patch<ApiResponse<Service>>(`/services/${id}/featured`);
    return res.data.data;
  },

  reorder: async (ids: string[]): Promise<void> => {
    await api.patch('/services/reorder', { ids });
  },
};
