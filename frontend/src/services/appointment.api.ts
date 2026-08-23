import { api } from '../lib/api';
import type { ApiResponse } from '../types/auth.types';
import type { Appointment, SlotsResponse } from '../types/appointment.types';

export const appointmentApi = {
  getSettings: async (serviceId: string): Promise<any> => {
    const res = await api.get<ApiResponse<any>>(`/appointments/settings/${serviceId}`);
    return res.data.data;
  },

  saveSettings: async (serviceId: string, data: any): Promise<any> => {
    const res = await api.post<ApiResponse<any>>('/appointments/settings', {
      service: serviceId,
      ...data,
    });
    return res.data.data;
  },

  getAll: async (page = 1, limit = 10, filters = {}): Promise<any> => {
    const res = await api.get<ApiResponse<any>>('/appointments', { params: { page, limit, ...filters } });
    return res.data.data;
  },

  updateStatus: async (id: string, status: string): Promise<Appointment> => {
    const res = await api.patch<ApiResponse<Appointment>>(`/appointments/${id}/status`, { status });
    return res.data.data;
  },

  getAvailableSlots: async (serviceId: string, date: string): Promise<SlotsResponse> => {
    const res = await api.get<ApiResponse<SlotsResponse>>('/appointments/slots', {
      params: { service: serviceId, date },
    });
    return res.data.data;
  },

  book: async (body: { service: string; appointmentDate: string; slotStart: string; slotEnd: string; remarks?: string }): Promise<Appointment> => {
    const res = await api.post<ApiResponse<Appointment>>('/appointments', body);
    return res.data.data;
  },
};
