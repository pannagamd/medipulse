import { api } from './client';

import type { LoginResponse, TokenPair, User } from '@/types/api';

export interface LoginPayload {
  username: string;
  password: string;
}

export interface RegisterPayload {
  full_name: string;
  phone_number: string;
  password: string;
}

export async function login(payload: LoginPayload) {
  const { data } = await api.post<LoginResponse>('/auth/login', payload);
  return data;
}

export async function register(payload: RegisterPayload) {
  const { data } = await api.post<LoginResponse>('/auth/register', payload);
  return data;
}

export async function getCurrentUser() {
  const { data } = await api.get<User>('/auth/me');
  return data;
}

export async function logout(refreshToken: string) {
  const { data } = await api.post<{ message: string }>('/auth/logout', { refresh_token: refreshToken });
  return data;
}

export type { TokenPair };
