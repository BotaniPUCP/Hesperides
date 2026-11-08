import { apiClient } from './api';
import type { CreateIrrigationTurnRequest, IrrigationCoverage, IrrigationOperatingWindow, IrrigationTurn, IrrigationZone } from '@shared/types/irrigation';
import type { CreateIrrigationPumpReadingRequest, IrrigationPumpReading, IrrigationPumpReadings } from '@shared/types/irrigation';

export const irrigationApi = {
  coverage: () => apiClient.get<IrrigationCoverage>('/irrigation/coverage'),
  pumpReadings: () => apiClient.get<IrrigationPumpReadings>('/irrigation/pump-readings'),
  createPumpReading: (payload: CreateIrrigationPumpReadingRequest) =>
    apiClient.post<IrrigationPumpReading>('/irrigation/pump-readings', payload),
  operatingWindow: () => apiClient.get<IrrigationOperatingWindow>('/irrigation/operating-window'),
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
