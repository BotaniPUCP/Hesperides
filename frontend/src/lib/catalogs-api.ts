import type {
  CatalogItem,
  CatalogType,
  CatalogTypeDetail,
  CreateCatalogItemRequest,
  UpdateCatalogItemRequest,
} from '@shared/types';
import { apiClient } from './api';

/**
 * Los siete endpoints de SPEC-003. El `code` va en la ruta y nunca un id: el
 * backend no lo expone porque cambia en cada resiembra de catálogos.
 */
export const catalogsApi = {
  /** Ítems activos de un catálogo. Lo que consume todo desplegable. */
  activeItems: (typeCode: string) =>
    apiClient.get<CatalogItem[]>(`/catalogs/${typeCode}/items`),

  allTypes: () => apiClient.get<CatalogType[]>('/catalogs'),

  /** El tipo con todos sus ítems, activos o no. Solo ADMIN. */
  typeDetail: (typeCode: string) =>
    apiClient.get<CatalogTypeDetail>(`/catalogs/${typeCode}`),

  createItem: (typeCode: string, body: CreateCatalogItemRequest) =>
    apiClient.post<CatalogItem>(`/catalogs/${typeCode}/items`, body),

  updateItem: (typeCode: string, code: string, body: UpdateCatalogItemRequest) =>
    apiClient.put<CatalogItem>(`/catalogs/${typeCode}/items/${code}`, body),

  deactivateItem: (typeCode: string, code: string) =>
    apiClient.patch<CatalogItem>(`/catalogs/${typeCode}/items/${code}/deactivate`),

  activateItem: (typeCode: string, code: string) =>
    apiClient.patch<CatalogItem>(`/catalogs/${typeCode}/items/${code}/activate`),
};
