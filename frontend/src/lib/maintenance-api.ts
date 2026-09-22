import type {
  CreateMaintenanceFrequencyRequest,
  MaintenanceFrequency,
  UpdateMaintenanceFrequencyRequest,
} from '@shared/types';
import { apiClient } from './api';

export interface FrequencyFilters {
  regime?: string;
  activityTypeItemId?: number;
  active?: boolean;
}

function buildQuery(filters: FrequencyFilters): string {
  const params = new URLSearchParams();
  if (filters.regime) params.set('regime', filters.regime);
  if (filters.activityTypeItemId) params.set('activityTypeItemId', String(filters.activityTypeItemId));
  if (filters.active !== undefined) params.set('active', String(filters.active));
  return params.toString();
}

export const maintenanceApi = {
  list: (filters: FrequencyFilters = {}) => {
    const q = buildQuery(filters);
    return apiClient.get<MaintenanceFrequency[]>(`/maintenance/frequencies${q ? `?${q}` : ''}`);
  },

  getById: (id: number) => apiClient.get<MaintenanceFrequency>(`/maintenance/frequencies/${id}`),

  create: (payload: CreateMaintenanceFrequencyRequest) =>
    apiClient.post<MaintenanceFrequency>('/maintenance/frequencies', payload),

  update: (id: number, payload: UpdateMaintenanceFrequencyRequest) =>
    apiClient.put<MaintenanceFrequency>(`/maintenance/frequencies/${id}`, payload),

  delete: (id: number) => apiClient.del<null>(`/maintenance/frequencies/${id}`),

  getActivityTypes: () =>
    apiClient.get<{ id: number; code: string; label: string; parentCode?: string | null }[]>(
      '/maintenance/frequencies/activity-types'
    ),

  getRuleTypes: () =>
    apiClient.get<{ id: number; code: string; label: string }[]>(
      '/maintenance/frequencies/rule-types'
    ),
};
