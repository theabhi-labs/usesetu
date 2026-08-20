import { api } from '../lib/api';
import type { ApiResponse, User } from '../types/auth.types';

export interface RegisterPayload {
  name: string;
  email: string;
  mobile: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface VerifyOtpPayload {
  email: string;
  otp: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  password: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
}

export const authApi = {
  register: async (payload: RegisterPayload): Promise<{ user: User }> => {
    const res = await api.post<ApiResponse<{ user: User }>>('/auth/register', payload);
    return res.data.data;
  },

  verifyOtp: async (payload: VerifyOtpPayload): Promise<LoginResponse> => {
    const res = await api.post<ApiResponse<LoginResponse>>('/auth/verify-otp', payload);
    return res.data.data;
  },

  resendOtp: async (email: string): Promise<{ message: string }> => {
    const res = await api.post<ApiResponse<{ message: string }>>('/auth/resend-otp', { email });
    return res.data.data;
  },

  login: async (payload: LoginPayload): Promise<LoginResponse> => {
    const res = await api.post<ApiResponse<LoginResponse>>('/auth/login', payload);
    return res.data.data;
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
  },

  forgotPassword: async (payload: ForgotPasswordPayload): Promise<{ message: string }> => {
    const res = await api.post<ApiResponse<{ message: string }>>('/auth/forgot-password', payload);
    return res.data.data;
  },

  resetPassword: async (payload: ResetPasswordPayload): Promise<{ message: string }> => {
    const res = await api.post<ApiResponse<{ message: string }>>('/auth/reset-password', payload);
    return res.data.data;
  },

  changePassword: async (payload: ChangePasswordPayload): Promise<{ message: string }> => {
    const res = await api.post<ApiResponse<{ message: string }>>('/auth/change-password', payload);
    return res.data.data;
  },

  getMe: async (): Promise<{ user: User }> => {
    const res = await api.get<ApiResponse<{ user: User }>>('/auth/me');
    return res.data.data;
  },
};
