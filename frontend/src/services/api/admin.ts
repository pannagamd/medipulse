import { api } from './client';

import type { AuditLog, EnrichmentResult, ImportBatchListResponse, ImportResult } from '@/types/api';

export async function listImportBatches(limit = 50, offset = 0) {
  const { data } = await api.get<ImportBatchListResponse>('/admin/imports/batches', {
    params: { limit, offset },
  });
  return data;
}

export async function importMedicines(file: File, sourceName = 'local') {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('source_name', sourceName);

  const { data } = await api.post<ImportResult>('/admin/imports/medicines', formData);
  return data;
}

export async function importDdinter(file: File, sourceName = 'DDInter') {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('source_name', sourceName);

  const { data } = await api.post<Record<string, number>>('/admin/imports/ddinter', formData);
  return data;
}

export async function listAuditLogs(limit = 50, offset = 0, action?: string, actorUserId?: string) {
  const { data } = await api.get<AuditLog[]>('/admin/audit', {
    params: { limit, offset, action, actor_user_id: actorUserId },
  });
  return data;
}

export async function enrichMedicineRxnorm(medicineId: string) {
  const { data } = await api.post<EnrichmentResult>(`/admin/enrichment/medicines/${medicineId}/rxnorm`);
  return data;
}

export async function enrichMedicineOpenfdaLabel(medicineId: string) {
  const { data } = await api.post<EnrichmentResult>(`/admin/enrichment/medicines/${medicineId}/openfda-label`);
  return data;
}