import { api } from '../lib/api';
import type { ApiResponse } from '../types/auth.types';

export interface LockerDocument {
  _id: string;
  customer: string;
  type: string;
  url: string;
  fileId: string;
  originalName: string;
  size: number;
  mimeType: string;
  createdAt: string;
}

export const lockerApi = {
  getAll: async (customer?: string): Promise<LockerDocument[]> => {
    const res = await api.get<ApiResponse<LockerDocument[]>>('/locker', {
      params: { customer },
    });
    return res.data.data;
  },

  upload: async (formData: FormData): Promise<LockerDocument> => {
    const res = await api.post<ApiResponse<LockerDocument>>('/locker', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/locker/${id}`);
  },
};
