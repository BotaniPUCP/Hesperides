import type {
  ComplianceReport,
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
  /** Solo las frecuencias vigentes: el historial se pide aparte. */
  list: (filters: FrequencyFilters = {}) => {
    const q = buildQuery(filters);
    return apiClient.get<MaintenanceFrequency[]>(`/maintenance/frequencies${q ? `?${q}` : ''}`);
  },

  getById: (id: number) => apiClient.get<MaintenanceFrequency>(`/maintenance/frequencies/${id}`),

  /**
   * Todas las versiones de una actividad, incluidas las cerradas. Es lo que
   * responde "por que este mes se juzgo asi".
   */
  getHistory: (activityTypeItemId: number, regime?: string) => {
    const q = regime ? `?regime=${regime}` : '';
    return apiClient.get<MaintenanceFrequency[]>(
      `/maintenance/frequencies/history/${activityTypeItemId}${q}`
    );
  },

  create: (payload: CreateMaintenanceFrequencyRequest) =>
    apiClient.post<MaintenanceFrequency>('/maintenance/frequencies', payload),

  /** Versiona: la respuesta puede traer un id distinto al enviado. */
  update: (id: number, payload: UpdateMaintenanceFrequencyRequest) =>
    apiClient.put<MaintenanceFrequency>(`/maintenance/frequencies/${id}`, payload),

  delete: (id: number) => apiClient.del<null>(`/maintenance/frequencies/${id}`),

  /** Cumplimiento en un periodo, con un tramo por version de la regla. */
  getCompliance: (from: string, to: string, activityTypeItemId?: number) => {
    const params = new URLSearchParams({ from, to });
    if (activityTypeItemId) params.set('activityTypeItemId', String(activityTypeItemId));
    return apiClient.get<ComplianceReport[]>(`/maintenance/frequencies/compliance?${params}`);
  },

  getActivityTypes: () =>
    apiClient.get<{ id: number; code: string; label: string; parentCode?: string | null }[]>(
      '/maintenance/frequencies/activity-types'
    ),

  getRuleTypes: () =>
    apiClient.get<{ id: number; code: string; label: string }[]>(
      '/maintenance/frequencies/rule-types'
    ),
};
