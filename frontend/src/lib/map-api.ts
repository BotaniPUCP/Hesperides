import type { BuildingModelManifest, LocationDescription, MapLayersResponse } from '@shared/types';
import { apiClient } from './api';

/** Los endpoints del mapa del campus (SPEC-102 §5.1). */
export const mapApi = {
  /** Todas las capas; con la etiqueta de la copia local, responde «sin cambios» si nada cambió. */
  layers: (etag: string | null) => apiClient.getIfChanged<MapLayersResponse>('/map/layers', etag),

  /** El texto «dónde está» de un punto, el mismo que se guarda en una incidencia. */
  describe: (lat: number, lon: number) => apiClient.post<LocationDescription>('/map/describe', { lat, lon }),

  /** El modelo 3D (GLB) de los edificios del plano oficial. */
  buildingModel: () => apiClient.getBlob('/map/models/buildings'),

  /** El manifiesto del modelo; el servidor lo envuelve en `data.manifest`. */
  buildingModelManifest: async (): Promise<BuildingModelManifest> =>
    (await apiClient.get<{ manifest: BuildingModelManifest }>('/map/models/buildings/manifest')).manifest,
};
