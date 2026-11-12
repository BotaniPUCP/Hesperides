import type { PlanningAssignment, PlanningAssignmentRequest, PlanningRow, RecentAttention } from '@shared/types';
import { apiClient } from './api';

const path = '/maintenance/planning';

/** SPEC-203 §3.2 y §3.3: planificación preventiva; solo ADMIN y COORDINADOR. */
export const planningApi = {
  rows: () => apiClient.get<PlanningRow[]>(path),
  recentAttention: (activityTypeItemId: number, date: string, zoneIds: number[]) =>
    apiClient.get<RecentAttention[]>(
      `${path}/recent-attention?activityTypeItemId=${activityTypeItemId}&date=${date}&zoneIds=${zoneIds.join(',')}`),
  /** SPEC-203 §3.4: qué frecuencia se planifica en cada conjunto. */
  assignments: {
    list: (ruleKey?: string) =>
      apiClient.get<PlanningAssignment[]>(`${path}/assignments${ruleKey ? `?ruleKey=${encodeURIComponent(ruleKey)}` : ''}`),
    create: (body: PlanningAssignmentRequest) => apiClient.post<PlanningAssignment>(`${path}/assignments`, body),
    change: (id: number, body: PlanningAssignmentRequest) => apiClient.put<PlanningAssignment>(`${path}/assignments/${id}`, body),
    remove: (id: number) => apiClient.del<null>(`${path}/assignments/${id}`),
  },
};
