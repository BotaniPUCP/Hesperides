import type {
  ApiResponse,
  Page,
  Species,
  Specimen,
  VegetationType,
} from '@shared/types';
import { apiClient } from './api';

export interface GetSpeciesParams {
  search?: string;
  vegetationType?: string;
  page?: number;
  size?: number;
}

export interface GetSpecimensParams {
  search?: string;
  location?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  page?: number;
  size?: number;
}

export interface InventarioStatsDto {
  totalSpecies: number;
  totalSpecimens: number;
  vegetationTypes: VegetationType[];
}

/**
 * Cliente de API para el módulo de Inventario Verde.
 * Consume los endpoints correspondientes en Spring Boot (:8080).
 */
export const inventarioVerdeApi = {
  /**
   * Obtiene listado paginado de especies del catálogo.
   */
  async getSpecies(params: GetSpeciesParams = {}): Promise<Page<Species>> {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.vegetationType && params.vegetationType !== 'ALL') {
      query.set('vegetationType', params.vegetationType);
    }
    if (params.page !== undefined) query.set('page', String(params.page));
    if (params.size !== undefined) query.set('size', String(params.size));

    const response = await apiClient.get<ApiResponse<Page<Species>>>(
      `/api/v1/inventario-verde/species?${query.toString()}`
    );
    if (!response.data) throw new Error(response.message || 'Error al obtener especies');
    return response.data;
  },

  /**
   * Obtiene una especie por su ID.
   */
  async getSpeciesById(id: number): Promise<Species> {
    const response = await apiClient.get<ApiResponse<Species>>(
      `/api/v1/inventario-verde/species/${id}`
    );
    if (!response.data) throw new Error(response.message || 'Especie no encontrada');
    return response.data;
  },

  /**
   * Obtiene los ejemplares censados de una especie.
   */
  async getSpecimens(
    speciesId: number,
    params: GetSpecimensParams = {}
  ): Promise<Page<Specimen>> {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.location && params.location !== 'ALL') {
      query.set('location', params.location);
    }
    if (params.sortBy) query.set('sortBy', params.sortBy);
    if (params.sortDirection) query.set('sortDirection', params.sortDirection);
    if (params.page !== undefined) query.set('page', String(params.page));
    if (params.size !== undefined) query.set('size', String(params.size));

    const response = await apiClient.get<ApiResponse<Page<Specimen>>>(
      `/api/v1/inventario-verde/species/${speciesId}/specimens?${query.toString()}`
    );
    if (!response.data) throw new Error(response.message || 'Error al obtener ejemplares');
    return response.data;
  },

  /**
   * Obtiene un ejemplar por su ID.
   */
  async getSpecimenById(specimenId: number): Promise<Specimen> {
    const response = await apiClient.get<ApiResponse<Specimen>>(
      `/api/v1/inventario-verde/specimens/${specimenId}`
    );
    if (!response.data) throw new Error(response.message || 'Ejemplar no encontrado');
    return response.data;
  },

  /**
   * Obtiene resumen estadístico del inventario verde.
   */
  async getStats(): Promise<InventarioStatsDto> {
    const response = await apiClient.get<ApiResponse<InventarioStatsDto>>(
      '/api/v1/inventario-verde/stats'
    );
    if (!response.data) throw new Error(response.message || 'Error al obtener estadísticas');
    return response.data;
  },
};
