import axios, { AxiosError } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';
import type { ApiResponse, ApiErrorResponse } from '../types/auth.types';

export const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (token) {
      prom.resolve(token);
    } else {
      prom.reject(error);
    }
  });
  failedQueue = [];
};

// Request Interceptor: Attach access token and clean empty query params
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (config.params) {
      const cleanParams = { ...config.params };
      Object.keys(cleanParams).forEach((key) => {
        if (cleanParams[key] === '') {
          delete cleanParams[key];
        }
      });
      config.params = cleanParams;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 Refresh token rotation
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Avoid loops on auth-specific routes
    const isAuthRoute =
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/refresh') ||
      originalRequest.url?.includes('/auth/register') ||
      originalRequest.url?.includes('/auth/verify-otp');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRoute) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Request a new access token
        const refreshResponse = await axios.post<ApiResponse<{ accessToken: string; user: any }>>(
          '/api/v1/auth/refresh',
          {},
          { withCredentials: true }
        );

        const { accessToken, user } = refreshResponse.data.data;
        const currentUser = useAuthStore.getState().user;
        useAuthStore.getState().setSession(user || currentUser, accessToken);

        processQueue(null, accessToken);
        isRefreshing = false;

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;
        useAuthStore.getState().clearSession();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Helper to get general error message
export function getErrorMessage(error: any): string {
  if (axios.isAxiosError(error)) {
    const errorData = error.response?.data as ApiErrorResponse | undefined;
    return errorData?.message || error.message || 'An unexpected error occurred';
  }
  return error instanceof Error ? error.message : 'An unexpected error occurred';
}

// Helper to map backend validation field errors to React Hook Form setError
export function getFieldErrors(error: any): Array<{ field: string; message: string }> {
  if (axios.isAxiosError(error)) {
    const errorData = error.response?.data as ApiErrorResponse | undefined;
    if (errorData?.errors) {
      return errorData.errors
        .filter((err) => err.field)
        .map((err) => ({
          field: err.field!,
          message: err.message,
        }));
    }
  }
  return [];
}
