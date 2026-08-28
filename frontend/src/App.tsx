import * as React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { AppRoutes } from './routes/AppRoutes';
import { ToastContainer } from './components/ui/ToastContainer';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/themeStore';
import { authApi } from './services/auth.api';
import { api } from './lib/api';
import './App.css';

export default function App() {
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);
  const setInitialized = useAuthStore((state) => state.setInitialized);

  React.useEffect(() => {
    // Initialize active theme (dark / light / system preference)
    useThemeStore.getState().initTheme();

    const initializeSession = async () => {
      const storedToken = useAuthStore.getState().accessToken;
      const storedUser = useAuthStore.getState().user;

      try {
        // 1. If we already have a persisted token, verify with /auth/me
        if (storedToken) {
          try {
            const response = await authApi.getMe();
            setSession(response.user, storedToken);
            return;
          } catch {
            // Stored token expired, try /auth/refresh next
          }
        }

        // 2. Attempt silent token refresh via HTTP-only cookie
        const refreshRes = await api.post('/auth/refresh');
        if (refreshRes.data?.data?.accessToken) {
          const { accessToken, user } = refreshRes.data.data;
          setSession(user || storedUser, accessToken);
          return;
        }
      } catch {
        // If neither worked and there was no valid token, clear session
        if (!storedToken) {
          clearSession();
        }
      } finally {
        setInitialized(true);
      }
    };

    initializeSession();
  }, [setSession, clearSession, setInitialized]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
        <ToastContainer />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
