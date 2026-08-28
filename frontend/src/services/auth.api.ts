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
  user?: User;
  accessToken?: string;
  requires2FA?: boolean;
  twoFactorMethod?: 'email' | 'mobile' | 'authenticator';
  twoFactorToken?: string;
  emailMasked?: string;
  mobileMasked?: string;
}

export interface Verify2FAPayload {
  twoFactorToken: string;
  code: string;
  isBackupCode?: boolean;
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

  verify2FA: async (payload: Verify2FAPayload): Promise<LoginResponse> => {
    const res = await api.post<ApiResponse<LoginResponse>>('/auth/verify-2fa', payload);
    return res.data.data;
  },

  resend2FACode: async (twoFactorToken: string): Promise<{ message: string }> => {
    const res = await api.post<ApiResponse<{ message: string }>>('/auth/2fa/resend-code', { twoFactorToken });
    return res.data.data;
  },

  initiate2FA: async (method: 'email' | 'mobile' | 'authenticator'): Promise<any> => {
    const res = await api.post<ApiResponse<any>>('/auth/2fa/initiate', { method });
    return res.data.data;
  },

  confirm2FA: async (payload: { method: string; code: string }): Promise<any> => {
    const res = await api.post<ApiResponse<any>>('/auth/2fa/confirm', payload);
    return res.data.data;
  },

  disable2FA: async (password: string): Promise<any> => {
    const res = await api.post<ApiResponse<any>>('/auth/2fa/disable', { password });
    return res.data.data;
  },

  get2FAStatus: async (): Promise<{ enabled: boolean; method?: string; lastVerifiedAt?: string }> => {
    const res = await api.get<ApiResponse<{ enabled: boolean; method?: string; lastVerifiedAt?: string }>>('/auth/2fa/status');
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

  updateProfile: async (payload: { name?: string; mobile?: string; avatar?: { url: string; fileId?: string } }): Promise<{ user: User }> => {
    const res = await api.put<ApiResponse<{ user: User }>>('/auth/profile', payload);
    return res.data.data;
  },

  uploadAvatar: async (file: File): Promise<{ avatar: { url: string; fileId?: string }; user: User }> => {
    const formData = new FormData();
    formData.append('avatar', file);
    const res = await api.post<ApiResponse<{ avatar: { url: string; fileId?: string }; user: User }>>('/auth/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data.data;
  },

  verifyCard: async (token: string): Promise<any> => {
    const res = await api.get<ApiResponse<any>>(`/auth/verify-card/${token}`);
    return res.data.data;
  },
};

