import type {
  MapCatalog,
  PlaceMapView,
  MigrationProgress,
  PerspectiveInput,
  PhotoInput,
  PlaceDetail,
  PlaceInput,
  PlacePerspective,
  PlacePhoto,
  PlaceSummary,
  ReferenceQueuePage,
} from '@shared/types';
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

const segment = encodeURIComponent;

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
    apiClient.get<PlaceDetail>(`/places/${segment(code)}`).then((d) => ({
      ...d,
      mainPhotos: d.mainPhotos.map(withMedia),
      perspectives: d.perspectives.map((v) => ({ ...v, photos: v.photos.map(withMedia) })),
      interior: d.interior.map((g) => ({ ...g, photos: g.photos.map(withMedia) })),
    })),

  /** El catálogo resumido para el mapa principal. */
  map: () =>
    apiClient.get<MapCatalog>('/places/map').then((m) => ({
      ...m,
      perspectives: m.perspectives.map((v) => ({ ...v, thumbnailUrl: v.thumbnailUrl ? media(v.thumbnailUrl) : null })),
    })),

  create: (input: PlaceInput) => apiClient.post<{ code: string }>('/places', input),
  update: (code: string, input: PlaceInput) => apiClient.put<void>(`/places/${segment(code)}`, input),
  saveMapView: (code: string, view: PlaceMapView) => apiClient.put<void>(`/places/${segment(code)}/map-view`, view),
  clearMapView: (code: string) => apiClient.del<void>(`/places/${segment(code)}/map-view`),
  remove: (code: string) => apiClient.del<void>(`/places/${segment(code)}`),

  previewPerspective: (code: string, input: PerspectiveInput) =>
    apiClient.post<{ displayName: string }>(`/places/${segment(code)}/perspectives/preview`, input),
  createPerspective: (code: string, input: PerspectiveInput) =>
    apiClient.post<PlacePerspective>(`/places/${segment(code)}/perspectives`, input),
  updatePerspective: (code: string, id: number, input: PerspectiveInput) =>
    apiClient.put<PlacePerspective>(`/places/${segment(code)}/perspectives/${id}`, input),
  reorderPerspectives: (code: string, ids: number[]) =>
    apiClient.put<void>(`/places/${segment(code)}/perspectives/order`, { ids }),
  removePerspective: (code: string, id: number) => apiClient.del<void>(`/places/${segment(code)}/perspectives/${id}`),

  uploadPhoto: (code: string, file: File, target: PhotoInput) => {
    const form = new FormData();
    form.append('file', file);
    const q = new URLSearchParams();
    for (const [key, value] of Object.entries(target)) if (value !== undefined && value !== '') q.set(key, String(value));
    const params = q.toString();
    return apiClient.postForm<PlacePhoto>(`/places/${segment(code)}/photos${params ? `?${params}` : ''}`, form);
  },
  removePhoto: (code: string, photoId: number) => apiClient.del<void>(`/places/${segment(code)}/photos/${photoId}`),

  referenceQueue: (search: string, page: number, size: number) => {
    const q = new URLSearchParams({ page: String(page), size: String(size) });
    if (search.trim()) q.set('q', search.trim());
    return apiClient.get<ReferenceQueuePage>(`/places/reference-links/queue?${q.toString()}`);
  },
  migrationProgress: () => apiClient.get<MigrationProgress>('/places/reference-links/progress'),
  linkReferences: (referenceCodes: string[], placeCode: string, perspectiveId: number | null) =>
    apiClient.post<void>('/places/reference-links', { referenceCodes, placeCode, perspectiveId }),
  discardReferences: (referenceCodes: string[]) => apiClient.post<void>('/places/reference-links/discard', { referenceCodes }),
};
