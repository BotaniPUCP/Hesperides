import type { PlanningRow, RecentAttention } from '@shared/types';
import { apiClient } from './api';

const path = '/maintenance/planning';

/** SPEC-203 §3.2 y §3.3: planificación preventiva; solo ADMIN y COORDINADOR. */
export const planningApi = {
  rows: () => apiClient.get<PlanningRow[]>(path),
  recentAttention: (activityTypeItemId: number, date: string, zoneIds: number[]) =>
    apiClient.get<RecentAttention[]>(
      `${path}/recent-attention?activityTypeItemId=${activityTypeItemId}&date=${date}&zoneIds=${zoneIds.join(',')}`),
};
