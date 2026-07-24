import { api } from './client';

import type { SymptomSuggestionResponse } from '@/types/api';

export async function suggestSymptoms(payload: {
  symptoms: string[];
  existing_conditions?: string | null;
  allergies?: string | null;
  current_medications?: string | null;
  include_saved_profile?: boolean;
}) {
  const { data } = await api.post<SymptomSuggestionResponse>('/symptoms/suggest', payload);
  return data;
}