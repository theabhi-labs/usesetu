import { api } from '../lib/api';
import type { ApiResponse } from '../types/auth.types';

export interface UserDetail {
  _id: string;
  name: string;
  email: string;
  mobile: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const userApi = {
  getAll: async (page = 1, limit = 10, search = '', role = '', status = ''): Promise<{ users: UserDetail[]; pagination: any }> => {
    const res = await api.get<ApiResponse<{ users: UserDetail[]; pagination: any }>>('/users', {
      params: { page, limit, search, role, status },
    });
    return res.data.data;
  },

  getById: async (id: string): Promise<UserDetail> => {
    const res = await api.get<ApiResponse<UserDetail>>(`/users/${id}`);
    return res.data.data;
  },

  create: async (body: any): Promise<UserDetail> => {
    const res = await api.post<ApiResponse<UserDetail>>('/users', body);
    return res.data.data;
  },

  update: async (id: string, body: any): Promise<UserDetail> => {
    const res = await api.put<ApiResponse<UserDetail>>(`/users/${id}`, body);
    return res.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/users/${id}`);
  },
};
