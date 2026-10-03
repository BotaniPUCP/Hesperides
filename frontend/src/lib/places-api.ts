import type { PlaceDetail, PlacePhoto, PlaceSummary } from '@shared/types';
import { apiClient } from './api';
import { API_BASE_URL } from './constants';

export interface PlaceFilters {
  search?: string;
  category?: string;
  kind?: string;
}

/** Las fotos llegan como ruta de la API («/files/places/…»); el navegador necesita la dirección entera. */
const media = (url: string) => (url.startsWith('/') ? `${API_BASE_URL}${url}` : url);
const withMedia = (p: PlacePhoto): PlacePhoto => ({ ...p, thumbnailUrl: media(p.thumbnailUrl), fullUrl: media(p.fullUrl) });

function query(filters: PlaceFilters): string {
  const q = new URLSearchParams();
  if (filters.search?.trim()) q.set('q', filters.search.trim());
  if (filters.category) q.set('category', filters.category);
  if (filters.kind) q.set('kind', filters.kind);
  const s = q.toString();
  return s ? `?${s}` : '';
}

export const placesApi = {
  list: (filters: PlaceFilters) =>
    apiClient
      .get<PlaceSummary[]>(`/places${query(filters)}`)
      .then((list) => list.map((p) => ({ ...p, mainPhotoUrl: p.mainPhotoUrl ? media(p.mainPhotoUrl) : null }))),

  detail: (code: string) =>
    apiClient.get<PlaceDetail>(`/places/${encodeURIComponent(code)}`).then((d) => ({
      ...d,
      mainPhotos: d.mainPhotos.map(withMedia),
      perspectives: d.perspectives.map((v) => ({ ...v, photos: v.photos.map(withMedia) })),
      interior: d.interior.map((g) => ({ ...g, photos: g.photos.map(withMedia) })),
    })),
};
