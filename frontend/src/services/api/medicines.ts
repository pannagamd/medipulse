import { api } from './client';

import type { Medicine, MedicineSearchResponse } from '@/types/api';

export async function searchMedicines(query: string, limit = 12, offset = 0) {
  const { data } = await api.get<MedicineSearchResponse>('/medicines/search', {
    params: { q: query, limit, offset },
  });
  return data;
}

export async function getMedicine(medicineId: string) {
  const { data } = await api.get<Medicine>(`/medicines/${medicineId}`);
  return data;
}