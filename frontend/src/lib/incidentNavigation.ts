export interface IncidentFilters {
  search: string;
  status: string;
  page: number;
}

/** Keep only list filters, never an arbitrary return URL supplied by a caller. */
export function incidentFilters(params: Pick<URLSearchParams, 'get'>): IncidentFilters {
  const page = Number(params.get('page') ?? 0);
  return {
    search: (params.get('search') ?? '').slice(0, 200),
    status: (params.get('status') ?? '').slice(0, 50),
    page: Number.isSafeInteger(page) && page >= 0 && page <= 2147483647 ? page : 0,
  };
}

export function incidentQuery(filters: IncidentFilters): string {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.status) params.set('status', filters.status);
  if (filters.page > 0) params.set('page', String(filters.page));
  return params.toString();
}

export function incidentHref(path: string, filters: IncidentFilters): string {
  const query = incidentQuery(filters);
  return query ? `${path}?${query}` : path;
}

export function incidentDate(date: string): string {
  return new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(date));
}

export function positiveIncidentId(value: string | string[] | undefined | null): number | null {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

export function interventionCreationHref(id: number, filters: IncidentFilters): string {
  const query = new URLSearchParams({ fromIncident: String(id), incidentSearch: filters.search,
    incidentStatus: filters.status, incidentPage: String(filters.page) });
  return `/intervenciones/nueva?${query}`;
}

export function incidentAfterCreationHref(id: number, interventionId: number | null, filters: IncidentFilters): string {
  const href = incidentHref(`/incidencias/${id}`, filters);
  return interventionId === null ? href : `${href}${href.includes('?') ? '&' : '?'}selectIntervention=${interventionId}`;
}
