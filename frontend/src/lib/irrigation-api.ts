import { apiClient } from './api';
import type { CreateIrrigationTurnRequest, IrrigationTurn, IrrigationZone } from '@shared/types/irrigation';

export const irrigationApi = {
  sectors: () => apiClient.get<IrrigationZone[]>('/irrigation/sectors'),
  sections: (sectorId: number) =>
    apiClient.get<IrrigationZone[]>(`/irrigation/sectors/${sectorId}/sections`),
  turns: (from: string, to: string, sectorId?: number) => {
    const params = new URLSearchParams({ from, to });
    if (sectorId) params.set('sectorId', String(sectorId));
    return apiClient.get<IrrigationTurn[]>(`/irrigation/turns?${params}`);
  },
  create: (payload: CreateIrrigationTurnRequest) =>
    apiClient.post<IrrigationTurn>('/irrigation/turns', payload),
  /** Atomico: si un sector falla, ninguno queda guardado. */
  createBatch: (turns: CreateIrrigationTurnRequest[]) =>
    apiClient.post<IrrigationTurn[]>('/irrigation/turns/batch', { turns }),
};
