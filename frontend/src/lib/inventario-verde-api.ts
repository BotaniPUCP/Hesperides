import type {
  InventorySummary,
  LocationCount,
  Page,
  Species,
  SpecimenDetail,
  Specimen,
  SpecimenSortKey,
} from '@shared/types';
import { apiClient } from './api';

export interface SpeciesParams {
  search?: string;
  vegetationType?: string;
  page: number;
  size: number;
}

export interface SpecimenParams {
  search?: string;
  location?: string;
  sortBy: SpecimenSortKey;
  sortDirection: 'asc' | 'desc';
  page: number;
  size: number;
}

/** Arma el query string sin los filtros vacíos: el backend los toma como «todos». */
function query(params: Record<string, string | number | undefined>): string {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') q.set(key, String(value));
  }
  return q.toString();
}

const ALL = 'ALL';
const unlessAll = (value?: string) => (value && value !== ALL ? value : undefined);
const segment = encodeURIComponent;

/** Los endpoints del inventario verde. Son públicos por ahora (README del inventario). */
export const inventarioVerdeApi = {
  summary: () => apiClient.get<InventorySummary>('/green-inventory/summary'),

  species: (p: SpeciesParams) =>
    apiClient.get<Page<Species>>(
      `/green-inventory/species?${query({ search: p.search?.trim(), vegetationType: unlessAll(p.vegetationType), page: p.page, size: p.size })}`,
    ),

  speciesBySlug: (slug: string) => apiClient.get<Species>(`/green-inventory/species/${segment(slug)}`),

  specimens: (slug: string, p: SpecimenParams) =>
    apiClient.get<Page<Specimen>>(
      `/green-inventory/species/${segment(slug)}/specimens?${query({
        search: p.search?.trim(),
        location: unlessAll(p.location),
        sort: p.sortBy,
        direction: p.sortDirection,
        page: p.page,
        size: p.size,
      })}`,
    ),

  locations: (slug: string) => apiClient.get<LocationCount[]>(`/green-inventory/species/${segment(slug)}/locations`),

  specimen: (code: string) => apiClient.get<SpecimenDetail>(`/green-inventory/specimens/${segment(code)}`),
};
