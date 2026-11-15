import type { BalloonsResponse } from '@shared/types';
import { apiClient } from './api';

/** SPEC-113 §3: los globos vigentes del mapa, ya ordenados por urgencia. */
export const balloonsApi = {
  list: () => apiClient.get<BalloonsResponse>('/map/balloons'),
};
