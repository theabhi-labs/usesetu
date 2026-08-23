import { api } from '../lib/api';
import type { ApiResponse } from '../types/auth.types';

export const notificationApi = {
  getAll: async (page = 1, limit = 10): Promise<any> => {
    const res = await api.get<ApiResponse<any>>('/notifications', { params: { page, limit } });
    return res.data.data;
  },

  getUnreadCount: async (): Promise<{ count: number }> => {
    const res = await api.get<ApiResponse<{ count: number }>>('/notifications/unread-count');
    return res.data.data;
  },

  markRead: async (id: string): Promise<any> => {
    const res = await api.patch<ApiResponse<any>>(`/notifications/${id}/read`);
    return res.data.data;
  },

  markAllRead: async (): Promise<any> => {
    const res = await api.patch<ApiResponse<any>>('/notifications/read-all');
    return res.data.data;
  },

  getPreferences: async (): Promise<any> => {
    const res = await api.get<ApiResponse<any>>('/notifications/preferences');
    return res.data.data;
  },

  updatePreferences: async (preferences: { email: boolean; in_app: boolean }): Promise<any> => {
    const res = await api.put<ApiResponse<any>>('/notifications/preferences', preferences);
    return res.data.data;
  },

  // Admin — Rules
  getRules: async (): Promise<any[]> => {
    const res = await api.get<ApiResponse<any[]>>('/notifications/rules');
    return res.data.data;
  },

  createRule: async (rule: any): Promise<any> => {
    const res = await api.post<ApiResponse<any>>('/notifications/rules', rule);
    return res.data.data;
  },

  updateRule: async (id: string, rule: any): Promise<any> => {
    const res = await api.put<ApiResponse<any>>(`/notifications/rules/${id}`, rule);
    return res.data.data;
  },

  deleteRule: async (id: string): Promise<void> => {
    await api.delete(`/notifications/rules/${id}`);
  },

  // Admin — Templates
  getTemplates: async (): Promise<any[]> => {
    const res = await api.get<ApiResponse<any[]>>('/notifications/templates');
    return res.data.data;
  },

  upsertTemplate: async (template: { templateKey: string; subject: string; body: string }): Promise<any> => {
    const res = await api.post<ApiResponse<any>>('/notifications/templates', template);
    return res.data.data;
  },
};
