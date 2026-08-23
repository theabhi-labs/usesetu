import { api } from '../lib/api';
import type { ApiResponse } from '../types/auth.types';
import type { QueueLiveStatus, QueueToken, TokenPriority } from '../types/queue.types';

export const queueApi = {
  getConfig: async (serviceId: string): Promise<any> => {
    const res = await api.get<ApiResponse<any>>(`/queue/config/${serviceId}`);
    return res.data.data;
  },

  saveConfig: async (serviceId: string, data: any): Promise<any> => {
    const res = await api.post<ApiResponse<any>>(`/queue/config/${serviceId}`, data);
    return res.data.data;
  },

  getCurrent: async (serviceId: string): Promise<QueueLiveStatus> => {
    const res = await api.get<ApiResponse<QueueLiveStatus>>('/queue/current', { params: { service: serviceId } });
    return res.data.data;
  },

  generateToken: async (body: { service: string; priority: TokenPriority }): Promise<QueueToken> => {
    const res = await api.post<ApiResponse<QueueToken>>('/queue/token', body);
    return res.data.data;
  },

  callNext: async (serviceId: string, counter: string): Promise<QueueToken> => {
    const res = await api.patch<ApiResponse<QueueToken>>('/queue/token/call', { service: serviceId, counter });
    return res.data.data;
  },

  updateTokenStatus: async (tokenId: string, status: string): Promise<QueueToken> => {
    const res = await api.patch<ApiResponse<QueueToken>>(`/queue/token/${tokenId}/status`, { status });
    return res.data.data;
  },

  getTokens: async (page = 1, limit = 10, filters = {}): Promise<any> => {
    const res = await api.get<ApiResponse<any>>('/queue/tokens', { params: { page, limit, ...filters } });
    return res.data.data;
  },

  getAnalytics: async (filters = {}): Promise<any> => {
    const res = await api.get<ApiResponse<any>>('/queue/analytics', { params: filters });
    return res.data.data;
  },
};
