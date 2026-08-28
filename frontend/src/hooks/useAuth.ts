import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { authApi } from '../services/auth.api';

export function useAuth() {
  const queryClient = useQueryClient();
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);
  const addToast = useToastStore((state) => state.addToast);

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      if (data.user && data.accessToken) {
        setSession(data.user, data.accessToken);
        addToast('Logged in successfully', 'success');
      }
    },
  });

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: () => {
      addToast('Registration successful! Please check your mobile/email for OTP.', 'success');
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: authApi.verifyOtp,
    onSuccess: (data) => {
      if (data.user && data.accessToken) {
        setSession(data.user, data.accessToken);
        addToast('Account verified and logged in', 'success');
      }
    },
  });

  const resendOtpMutation = useMutation({
    mutationFn: authApi.resendOtp,
    onSuccess: (data) => {
      addToast(data.message || 'OTP resent successfully', 'success');
    },
  });

  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      clearSession();
      queryClient.clear();
      addToast('Logged out successfully', 'success');
    },
    onError: () => {
      // Force clear session anyway on error
      clearSession();
      queryClient.clear();
    },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: authApi.forgotPassword,
    onSuccess: (data) => {
      addToast(data.message || 'Verification details sent if email exists.', 'success');
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: authApi.resetPassword,
    onSuccess: (data) => {
      addToast(data.message || 'Password reset successfully. You can now log in.', 'success');
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: authApi.changePassword,
    onSuccess: (data) => {
      addToast(data.message || 'Password changed successfully. Logging out...', 'success');
      clearSession();
      queryClient.clear();
    },
  });

  // Query to fetch current user session (silent validation)
  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: authApi.getMe,
    retry: false,
    enabled: false,
  });

  return {
    login: loginMutation,
    register: registerMutation,
    verifyOtp: verifyOtpMutation,
    resendOtp: resendOtpMutation,
    logout: logoutMutation,
    forgotPassword: forgotPasswordMutation,
    resetPassword: resetPasswordMutation,
    changePassword: changePasswordMutation,
    meQuery,
  };
}
