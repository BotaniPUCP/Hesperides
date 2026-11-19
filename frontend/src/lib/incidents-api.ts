import type {
  Incident, IncidentCapture, IncidentDetail, IncidentMap, IncidentMine, IncidentOptions, IncidentPhoto,
  IncidentRef, IncidentReview, InterventionCandidate,
} from '@shared/types';
import { apiClient } from './api';

const path = '/incidents';

/** Cliente de SPEC-201 (rediseño). El vínculo con intervenciones se gestiona desde ambos módulos. */
export const incidentsApi = {
  /** Todas las que ve quien pregunta: se buscan, filtran y paginan en el navegador (SPEC-119). */
  all: () => apiClient.get<Incident[]>(`${path}/all`),
  mine: () => apiClient.get<IncidentMine>(`${path}/mine`),
  options: () => apiClient.get<IncidentOptions>(`${path}/options`),
  detail: (id: number) => apiClient.get<IncidentDetail>(`${path}/${id}`),
  create: (body: IncidentCapture, reference: string) => apiClient.post<IncidentDetail>(path, body, { 'Idempotency-Key': reference }),
  review: (id: number, body: IncidentReview) => apiClient.put<IncidentDetail>(`${path}/${id}`, body),
  activate: (id: number, version: number) => apiClient.post<IncidentDetail>(`${path}/${id}/activate`, { version }),
  retryPrefill: (id: number) => apiClient.post<IncidentDetail>(`${path}/${id}/prefill/retry`),
  close: (id: number, version: number, resolutionSummary: string) =>
    apiClient.post<IncidentDetail>(`${path}/${id}/close`, { version, resolutionSummary }),
  link: (id: number, version: number, interventionId: number) =>
    apiClient.post<IncidentDetail>(`${path}/${id}/links`, { version, interventionId }),
  unlink: (id: number, linkId: number, version: number, reason: string) =>
    apiClient.post<IncidentDetail>(`${path}/${id}/links/${linkId}/remove`, { version, reason }),
  replace: (id: number, linkId: number, version: number, interventionId: number, reason: string) =>
    apiClient.post<IncidentDetail>(`${path}/${id}/links/${linkId}/replace`, { version, interventionId, reason }),
  /** Todas las intervenciones no canceladas que se pueden vincular (SPEC-119). */
  candidates: () => apiClient.get<InterventionCandidate[]>(`${path}/intervention-candidates`),
  /** Todas las incidencias activas y abiertas, para vincularlas desde una intervención (SPEC-119). */
  search: () => apiClient.get<IncidentRef[]>(`${path}/search`),
  linkFromWork: (interventionId: number, incidentId: number) =>
    apiClient.post<null>(`/interventions/${interventionId}/incident-links`, { incidentId }),
  unlinkFromWork: (interventionId: number, linkId: number, reason: string) =>
    apiClient.post<null>(`/interventions/${interventionId}/incident-links/${linkId}/remove`, { reason }),
  comment: (id: number, body: string, clientReference: string) =>
    apiClient.post<IncidentDetail>(`${path}/${id}/comments`, { body, clientReference }),
  map: () => apiClient.get<IncidentMap>(`${path}/map`),
  upload: (id: number, file: File, reference: string) => {
    const form = new FormData();
    form.append('file', file);
    form.append('clientReference', reference);
    return apiClient.postForm<IncidentPhoto>(`${path}/${id}/photos`, form);
  },
  photo: (id: number, photoId: number) => apiClient.get<{ contentType: string; base64: string }>(`${path}/${id}/photos/${photoId}`),
};

/** getRandomValues también funciona por HTTP en la LAN, donde randomUUID no está disponible. */
export function newClientReference(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
