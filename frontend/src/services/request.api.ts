import { api } from '../lib/api';
import type { ApiResponse } from '../types/auth.types';
import type { Request, MoveStageBody, BulkActionBody } from '../types/request.types';

export const requestApi = {
  getAll: async (page = 1, limit = 10, filters = {}): Promise<any> => {
    const res = await api.get<ApiResponse<any>>('/requests', { params: { page, limit, ...filters } });
    return res.data.data;
  },

  getMyRequests: async (page = 1, limit = 10, filters = {}): Promise<any> => {
    const res = await api.get<ApiResponse<any>>('/requests/my', { params: { page, limit, ...filters } });
    return res.data.data;
  },

  trackPublic: async (applicationNumber: string): Promise<any> => {
    const res = await api.get<ApiResponse<any>>(`/requests/track/${applicationNumber}`);
    return res.data.data;
  },

  getById: async (id: string): Promise<Request> => {
    const res = await api.get<ApiResponse<Request>>(`/requests/${id}`);
    return res.data.data;
  },

  moveStage: async (id: string, body: MoveStageBody): Promise<Request> => {
    const res = await api.patch<ApiResponse<Request>>(`/requests/${id}/stage`, body);
    return res.data.data;
  },

  bulkAction: async (body: BulkActionBody): Promise<{ count: number; message: string }> => {
    const res = await api.post<ApiResponse<{ count: number; message: string }>>('/requests/bulk', body);
    return res.data.data;
  },

  uploadDocument: async (id: string, formData: FormData): Promise<Request> => {
    const res = await api.post<ApiResponse<Request>>(`/requests/${id}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
  },

  uploadCompletionDocument: async (id: string, formData: FormData): Promise<Request> => {
    const res = await api.post<ApiResponse<Request>>(`/requests/${id}/completion-document`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
  },

  downloadCompletionDocument: async (id: string): Promise<Blob> => {
    const res = await api.get(`/requests/${id}/completion-document/download`, {
      responseType: 'blob',
    });
    return res.data;
  },

  verifyDocument: async (
    requestId: string,
    docId: string,
    body: { verificationStatus: string; verificationRemark?: string }
  ): Promise<Request> => {
    const res = await api.patch<ApiResponse<Request>>(`/requests/${requestId}/documents/${docId}/verify`, body);
    return res.data.data;
  },

  getActivity: async (id: string): Promise<any[]> => {
    const res = await api.get<ApiResponse<any[]>>(`/requests/${id}/activity`);
    return res.data.data;
  },

  getComments: async (requestId: string): Promise<any[]> => {
    const res = await api.get<ApiResponse<any[]>>(`/requests/${requestId}/comments`);
    return res.data.data;
  },

  addComment: async (requestId: string, body: { content: string; isPublic?: boolean }): Promise<any> => {
    const res = await api.post<ApiResponse<any>>(`/requests/${requestId}/comments`, body);
    return res.data.data;
  },

  accept: async (id: string): Promise<Request> => {
    const res = await api.post<ApiResponse<Request>>(`/requests/${id}/accept`);
    return res.data.data;
  },

  assign: async (id: string, assignedTo: string): Promise<Request> => {
    const res = await api.patch<ApiResponse<Request>>(`/requests/${id}/assign`, { assignedTo });
    return res.data.data;
  },
};
