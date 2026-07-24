import { api } from './client';

import type { HealthProfile, HealthProfileUpdatePayload, ProfileSafetyCheckResponse } from '@/types/api';

export async function getProfile() {
  const { data } = await api.get<HealthProfile | null>('/profile');
  return data;
}

export async function updateProfile(payload: HealthProfileUpdatePayload) {
  const { data } = await api.put<HealthProfile>('/profile', payload);
  return data;
}

export async function safetyCheck(medicines: string[]) {
  const { data } = await api.post<ProfileSafetyCheckResponse>('/profile/safety-check', {
    medicines,
  });
  return data;
}