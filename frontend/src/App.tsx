import * as React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { AppRoutes } from './routes/AppRoutes';
import { ToastContainer } from './components/ui/ToastContainer';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/themeStore';
import { authApi } from './services/auth.api';
import './App.css';

export default function App() {
  const setSession = useAuthStore((state) => state.setSession);
  const setInitialized = useAuthStore((state) => state.setInitialized);

  React.useEffect(() => {
    // Initialize active theme (dark / light / system preference)
    useThemeStore.getState().initTheme();

    const initializeSession = async () => {
      try {
        const response = await authApi.getMe();
        const currentToken = useAuthStore.getState().accessToken;
        setSession(response.user, currentToken);
      } catch (err) {
        // Safe to ignore on startup, user is anonymous
      } finally {
        setInitialized(true);
      }
    };

    initializeSession();
  }, [setSession, setInitialized]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
        <ToastContainer />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
