import { api } from './client';

import type { InteractionAnalyzeResponse } from '@/types/api';

export async function analyzeInteractions(medicines: string[], includeProfileContext = true) {
  const { data } = await api.post<InteractionAnalyzeResponse>('/interactions/analyze', {
    medicines,
    include_profile_context: includeProfileContext,
  });
  return data;
}