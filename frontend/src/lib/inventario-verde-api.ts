import type {
  ExtraMeasure,
  InventorySummary,
  LocationCount,
  Species,
  SpeciesForm,
  SpecimenDetail,
  Specimen,
  SpecimenListItem,
} from '@shared/types';
import { apiClient } from './api';
import { API_BASE_URL } from './constants';

/**
 * Las fotos guardadas en nuestro almacenamiento llegan como ruta de la API
 * («/files/…»); los enlaces externos (Drive), completos. El navegador necesita
 * la dirección entera para las primeras.
 */
const media = (url: string | null) => (url && url.startsWith('/') ? `${API_BASE_URL}${url}` : url);
const withSpeciesMedia = (s: Species): Species => ({
  ...s,
  imageUrl: media(s.imageUrl),
  photos: (s.photos ?? []).map((p) => ({ ...p, thumbnailUrl: media(p.thumbnailUrl) ?? p.thumbnailUrl, imageUrl: media(p.imageUrl) ?? p.imageUrl })),
});
const withSpecimenMedia = <T extends Specimen>(s: T): T => ({ ...s, imageUrl: media(s.imageUrl), thumbnailUrl: media(s.thumbnailUrl) });

const segment = encodeURIComponent;

/** Los endpoints del inventario verde. Son públicos por ahora (README del inventario). */
export const inventarioVerdeApi = {
  summary: () => apiClient.get<InventorySummary>('/green-inventory/summary'),

  /** Activas y en proceso de retiro: se buscan, filtran y paginan en el navegador (SPEC-119). */
  allSpecies: () => apiClient.get<Species[]>('/green-inventory/species/all').then((list) => list.map(withSpeciesMedia)),

  speciesBySlug: (slug: string) =>
    apiClient.get<Species>(`/green-inventory/species/${segment(slug)}`).then(withSpeciesMedia),

  /** Todos los ejemplares vigentes; la ficha de una especie los filtra por su slug (SPEC-119). */
  allSpecimens: () =>
    apiClient.get<SpecimenListItem[]>('/green-inventory/specimens/all').then((list) => list.map(withSpecimenMedia)),

  locations: (slug: string) => apiClient.get<LocationCount[]>(`/green-inventory/species/${segment(slug)}/locations`),

  allLocations: () => apiClient.get<LocationCount[]>('/green-inventory/locations'),

  specimen: (code: string) =>
    apiClient
      .get<SpecimenDetail>(`/green-inventory/specimens/${segment(code)}`)
      .then((d) => ({ ...withSpecimenMedia(d), species: withSpeciesMedia(d.species) })),

  registerSpecies: (form: SpeciesForm, photo: File | null) => {
    const data = new FormData();
    data.append('data', new Blob([JSON.stringify(form)], { type: 'application/json' }));
    if (photo) data.append('photo', photo);
    return apiClient.postForm<Species>('/green-inventory/species', data).then(withSpeciesMedia);
  },

  extraMeasures: () => apiClient.get<ExtraMeasure[]>('/green-inventory/extra-measures'),

  createExtraMeasure: (form: { label: string; unitCode: string }) =>
    apiClient.post<ExtraMeasure>('/green-inventory/extra-measures', form),

  updateSpecies: (slug: string, form: SpeciesForm) =>
    apiClient.put<Species>(`/green-inventory/species/${segment(slug)}`, form).then(withSpeciesMedia),

  deactivateSpecies: (slug: string, reason: string) =>
    apiClient.patch<void>(`/green-inventory/species/${segment(slug)}/deactivate`, { reason }),

  deactivateSpecimen: (code: string, reason: string) =>
    apiClient.patch<void>(`/green-inventory/specimens/${segment(code)}/deactivate`, { reason }),
};
