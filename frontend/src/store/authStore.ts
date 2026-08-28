import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from '../types/auth.types';

interface AuthStoreState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  setSession: (user: User | null, accessToken: string | null) => void;
  clearSession: () => void;
  setInitialized: (initialized: boolean) => void;
}

export const useAuthStore = create<AuthStoreState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isInitialized: false,
      setSession: (user, accessToken) =>
        set({
          user,
          accessToken,
          isAuthenticated: !!accessToken,
        }),
      clearSession: () =>
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
        }),
      setInitialized: (initialized) => set({ isInitialized: initialized }),
    }),
    {
      name: 'usesetu-auth-session',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
