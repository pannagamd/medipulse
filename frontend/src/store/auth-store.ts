import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { TokenPair, User } from '@/types/api';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;

  // authReady is NOT persisted — it resets to false on every page load and is
  // set to true once the AuthBootstrap hydration resolves (success or failure).
  authReady: boolean;

  setSession: (payload: TokenPair, user?: User | null) => void;
  setUser: (user: User | null) => void;
  clearSession: () => void;
  setAuthReady: (ready: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      authReady: false,

      setSession: (payload, user = null) =>
        set({
          accessToken: payload.access_token,
          refreshToken: payload.refresh_token,
          user,
        }),

      setUser: (user) => set({ user }),

      // clearSession wipes tokens and marks auth as ready (so the spinner hides
      // and the router can redirect to login).
      // Also clears the sessionStorage alive flag so the session is fully ended.
      clearSession: () => {
        try { sessionStorage.removeItem('medipulse-session-alive'); } catch { /* ignore */ }
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          authReady: true,
        });
      },

      setAuthReady: (ready) => set({ authReady: ready }),
    }),
    {
      name: 'medipulse-auth',
      // Persist tokens and user identity only.
      // authReady is intentionally excluded — it must always start as false
      // on a fresh page load so AuthBootstrap can run its validation flow.
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
    },
  ),
);

export const authSelectors = {
  isAuthenticated: () => Boolean(useAuthStore.getState().accessToken),
  getAccessToken: () => useAuthStore.getState().accessToken,
  getRefreshToken: () => useAuthStore.getState().refreshToken,
};