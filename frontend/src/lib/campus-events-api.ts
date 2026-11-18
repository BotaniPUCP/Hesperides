import type {
  CampusEvent, CampusEventCheckQuery, CampusEventOccurrence, CampusEventRequest, CampusEventType, CampusEventWarning,
} from '@shared/types';
import { apiClient } from './api';

const EVENTS = '/campus-events';

function query(params: Record<string, string | number | readonly (string | number)[] | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) value.forEach((v) => search.append(key, String(v)));
    else search.set(key, String(value));
  }
  return search.toString();
}

/** SPEC-114 §3: los cuatro roles leen; registrar, editar y dar de baja es de coordinación. */
export const campusEventsApi = {
  occurrences: (from: string, to: string, type?: CampusEventType) =>
    apiClient.get<CampusEventOccurrence[]>(`${EVENTS}?${query({ from, to, type })}`),
  get: (id: number) => apiClient.get<CampusEvent>(`${EVENTS}/${id}`),
  create: (body: CampusEventRequest) => apiClient.post<CampusEvent>(EVENTS, body),
  update: (id: number, body: CampusEventRequest) => apiClient.put<CampusEvent>(`${EVENTS}/${id}`, body),
  remove: (id: number) => apiClient.del<null>(`${EVENTS}/${id}`),
  check: ({ dates, zoneIds, placeIds, startTime, endTime }: CampusEventCheckQuery) =>
    apiClient.get<CampusEventWarning[]>(`${EVENTS}/check?${query({ dates, zoneIds, placeIds, startTime, endTime })}`),
};
