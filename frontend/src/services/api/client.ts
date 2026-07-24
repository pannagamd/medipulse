import axios, { AxiosError } from 'axios';

import { API_BASE_URL } from '@/lib/constants';
import { useAuthStore } from '@/store/auth-store';
import type { ApiErrorShape, TokenPair } from '@/types/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  // Prevent infinite hangs when the backend is cold-starting or unreachable.
  // 15 s is generous enough for Render.com cold boots yet still fails fast.
  timeout: 15_000,
});

let pendingRefresh: Promise<string | null> | null = null;

function normalizeError(error: unknown): string {
  if (axios.isAxiosError<ApiErrorShape>(error)) {
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return 'Request timed out. The server may be starting up — please try again in a moment.';
    }
    if (!error.response) {
      return 'Cannot reach the API server. Please check your connection or try again shortly.';
    }
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (detail && typeof detail === 'object' && 'message' in detail && detail.message) return String(detail.message);
    if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg;
    return error.response?.data?.message ?? error.message;
  }
  return error instanceof Error ? error.message : 'Something went wrong';
}

// ── Request interceptor: attach Bearer token ───────────────────────────────
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: handle 401 → refresh → retry ────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorShape & { message?: string }>) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean };

    // Only attempt refresh for 401s on non-refresh endpoints, and only once.
    const isRefreshEndpoint = originalRequest?.url?.includes('/auth/refresh');
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isRefreshEndpoint
    ) {
      originalRequest._retry = true;
      const refreshToken = useAuthStore.getState().refreshToken;

      if (!refreshToken) {
        useAuthStore.getState().clearSession();
        return Promise.reject(new Error('Session expired. Please sign in again.'));
      }

      try {
        // Deduplicate concurrent refresh attempts.
        if (!pendingRefresh) {
          pendingRefresh = api
            .post<TokenPair>('/auth/refresh', { refresh_token: refreshToken })
            .then((response) => {
              useAuthStore.getState().setSession(response.data, useAuthStore.getState().user);
              return response.data.access_token;
            })
            .catch((refreshError) => {
              // Refresh failed — log out cleanly and propagate the error.
              useAuthStore.getState().clearSession();
              return Promise.reject(refreshError);
            })
            .finally(() => {
              pendingRefresh = null;
            });
        }

        const accessToken = await pendingRefresh;
        if (accessToken) {
          originalRequest.headers = originalRequest.headers ?? {};
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api.request(originalRequest);
        }
      } catch {
        // pendingRefresh already called clearSession — just reject.
        return Promise.reject(new Error('Session expired. Please sign in again.'));
      }
    }

    return Promise.reject(new Error(normalizeError(error)));
  },
);

export function getApiErrorMessage(error: unknown) {
  return normalizeError(error);
}