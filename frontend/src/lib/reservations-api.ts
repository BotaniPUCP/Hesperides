import type {
  Reservation,
  ReservationCheckQuery,
  ReservationGardenOption,
  ReservationImportOutcome,
  ReservationImportPlan,
  ReservationInput,
  ReservationNearbyQuery,
  ReservationOrganizationOption,
  ReservationPage,
  ReservationWarning,
} from '@shared/types';
import { apiClient } from './api';

/** Los endpoints de SPEC-107 §3 en un solo sitio: las pantallas no arman rutas a mano. */

export const RESERVATIONS_PAGE_SIZE = 20;

export interface ReservationFilters {
  from?: string;
  to?: string;
  placeId?: number;
  organizationCode?: string;
  includeCancelled?: boolean;
}

const RESERVATIONS = '/reservations';
const IMPORTS = '/imports';
const segment = encodeURIComponent;

function query(entries: Record<string, string | number | boolean | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(entries)) {
    // Un texto en blanco no es un filtro: `?q=` buscaría «nada».
    if (value === undefined || value === false || (typeof value === 'string' && value.trim() === '')) continue;
    params.set(key, String(typeof value === 'string' ? value.trim() : value));
  }
  return params.toString();
}

/** Las listas viajan como valores repetidos separados por coma, que Spring acepta. */
function list(values: number[] | string[] | undefined): string | undefined {
  return values === undefined || values.length === 0 ? undefined : values.join(',');
}

function withFile(file: File): FormData {
  const form = new FormData();
  form.append('file', file);
  return form;
}

export const reservationsApi = {
  list: (filters: ReservationFilters, page: number, size = RESERVATIONS_PAGE_SIZE) =>
    apiClient.get<ReservationPage>(`${RESERVATIONS}?${query({
      from: filters.from,
      to: filters.to,
      placeId: filters.placeId,
      organizationCode: filters.organizationCode,
      includeCancelled: filters.includeCancelled,
      page,
      size,
    })}`),

  detail: (code: string) => apiClient.get<Reservation>(`${RESERVATIONS}/${segment(code)}`),

  create: (input: ReservationInput) => apiClient.post<Reservation>(RESERVATIONS, input),

  update: (code: string, input: ReservationInput) =>
    apiClient.put<Reservation>(`${RESERVATIONS}/${segment(code)}`, input),

  cancel: (code: string, reason: string, version: number) =>
    apiClient.post<Reservation>(`${RESERVATIONS}/${segment(code)}/cancel`, { reason, version }),

  /** El solicitante confirmó (o retiró) que usará el jardín (enmienda 11 nov 2026). */
  confirmUse: (code: string, confirmed: boolean, version: number) =>
    apiClient.put<Reservation>(`${RESERVATIONS}/${segment(code)}/confirmation`, { confirmed, version }),

  /** El encargado marca (o retira) que el espacio está en uso. */
  recordUsage: (code: string, used: boolean, version: number) =>
    apiClient.put<Reservation>(`${RESERVATIONS}/${segment(code)}/usage`, { used, version }),

  /** Avisos antes de guardar (D-07, primer sentido). */
  check: ({ placeId, startsAt, endsAt, excludeCode }: ReservationCheckQuery) =>
    apiClient.get<ReservationWarning[]>(`${RESERVATIONS}/check?${query({
      placeId, startsAt, endsAt, excludeCode,
    })}`),

  /** Avisos del registro de intervención (D-07, segundo sentido). */
  nearby: ({ date, zoneIds, placeIds, points, elementIds, elementCodes }: ReservationNearbyQuery) =>
    apiClient.get<ReservationWarning[]>(`${RESERVATIONS}/nearby?${query({
      date,
      zoneIds: list(zoneIds),
      placeIds: list(placeIds),
      points,
      elementIds: list(elementIds),
      elementCodes: list(elementCodes),
    })}`),

  gardens: (search?: string) =>
    apiClient.get<ReservationGardenOption[]>(`${RESERVATIONS}/gardens?${query({ q: search })}`),

  organizations: () => apiClient.get<ReservationOrganizationOption[]>(`${RESERVATIONS}/organizations`),

  importTemplate: () => apiClient.getBlob(`${IMPORTS}/templates/reservations`),

  /** No escribe: abre un lote con lo que pasaría con cada fila (ciclo común, SPEC-103 D-04). */
  previewImport: (file: File) => apiClient.postForm<ReservationImportPlan>(`${IMPORTS}/reservations/preview`,
    withFile(file)),

  /** Escribe lo revisado en el lote. Todo o nada: con una fila con error responde 422. */
  confirmImport: (batchId: number) =>
    apiClient.post<ReservationImportOutcome>(`${IMPORTS}/${batchId}/confirm`, {}),
};
