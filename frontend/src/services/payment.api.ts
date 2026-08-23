import { api } from '../lib/api';
import type { ApiResponse } from '../types/auth.types';
import type { Payment, RecordPaymentBody, ReceiptResponse } from '../types/payment.types';

export const paymentApi = {
  getAll: async (page = 1, limit = 10, filters = {}): Promise<any> => {
    const res = await api.get<ApiResponse<any>>('/payments', { params: { page, limit, ...filters } });
    return res.data.data;
  },

  getStats: async (filters = {}): Promise<any> => {
    const res = await api.get<ApiResponse<any>>('/payments/stats', { params: filters });
    return res.data.data;
  },

  record: async (body: RecordPaymentBody): Promise<Payment> => {
    const res = await api.post<ApiResponse<Payment>>('/payments', body);
    return res.data.data;
  },

  getReceipt: async (id: string): Promise<ReceiptResponse> => {
    const res = await api.get<ApiResponse<ReceiptResponse>>(`/payments/${id}/receipt`);
    return res.data.data;
  },

  getInvoice: async (requestId: string): Promise<any> => {
    const res = await api.get<ApiResponse<any>>(`/payments/request/${requestId}/invoice`);
    return res.data.data;
  },

  refund: async (id: string, amount: number, reason: string): Promise<Payment> => {
    const res = await api.post<ApiResponse<Payment>>(`/payments/${id}/refund`, { amount, reason });
    return res.data.data;
  },
};
