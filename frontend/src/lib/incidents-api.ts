import type { Incident, IncidentCapture, IncidentDetail, IncidentOptions, IncidentPhoto, IncidentReview, IncidentSummary, InterventionCapture, Page } from '@shared/types';
import { apiClient } from './api';

const path = '/incidents';
export const incidentsApi = {
  list: (page: number, status: string, search: string) => apiClient.get<Page<Incident>>(
    `${path}?${new URLSearchParams({ page: String(page), size: '20', status, search })}`),
  options: () => apiClient.get<IncidentOptions>(`${path}/options`),
  summary: () => apiClient.get<IncidentSummary>(`${path}/summary`),
  detail: (id: number) => apiClient.get<IncidentDetail>(`${path}/${id}`),
  create: (body: IncidentCapture, reference: string) => apiClient.post<IncidentDetail>(path, body, { 'Idempotency-Key': reference }),
  review: (id: number, body: IncidentReview) => apiClient.put<IncidentDetail>(`${path}/${id}`, body),
  approve: (id: number, version: number) => apiClient.post<IncidentDetail>(`${path}/${id}/approve`, { version }),
  start: (id: number) => apiClient.post<IncidentDetail>(`${path}/${id}/start`),
  resolve: (id: number) => apiClient.post<IncidentDetail>(`${path}/${id}/resolve`),
  addIntervention: (id: number, body: InterventionCapture) => apiClient.post<IncidentDetail>(`${path}/${id}/interventions`, body),
  completeIntervention: (id: number, workId: number) => apiClient.post<IncidentDetail>(`${path}/${id}/interventions/${workId}/complete`),
  upload: (id: number, file: File, reference: string) => {
    const form = new FormData();
    form.append('file', file);
    form.append('clientReference', reference);
    return apiClient.postForm<IncidentPhoto>(`${path}/${id}/photos`, form);
  },
  photo: (id: number, photoId: number) => apiClient.get<{ contentType: string; base64: string }>(`${path}/${id}/photos/${photoId}`),
};

/** getRandomValues also works on LAN HTTP, where randomUUID is not available. */
export function newClientReference(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
