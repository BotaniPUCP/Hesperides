import type { GreenAreaSetDetail, GreenAreaSetElement, GreenAreaSetRequest, GreenAreaSetSummary } from '@shared/types';
import { apiClient } from './api';

const path = '/green-area-sets';

/** SPEC-203 §3.1: conjuntos de áreas verdes; solo ADMIN y COORDINADOR. */
export const greenAreaSetsApi = {
  list: () => apiClient.get<GreenAreaSetSummary[]>(path),
  get: (id: number) => apiClient.get<GreenAreaSetDetail>(`${path}/${id}`),
  create: (body: GreenAreaSetRequest) => apiClient.post<GreenAreaSetDetail>(path, body),
  update: (id: number, body: GreenAreaSetRequest) => apiClient.put<GreenAreaSetDetail>(`${path}/${id}`, body),
  remove: (id: number) => apiClient.del<null>(`${path}/${id}`),
  /** Los ejemplares que el mapa deja agregar, con su sector. */
  elementOptions: () => apiClient.get<GreenAreaSetElement[]>(`${path}/element-options`),
};
