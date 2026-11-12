/** M7/D-01: contratos de registro, sin afirmar cobertura D-02. */
export interface IrrigationZone {
  id: number;
  code: string;
  name: string;
}

export interface IrrigationTurn {
  id: number;
  sectorZoneId: number;
  sectorName: string;
  supervisorUserId: number;
  irrigationDate: string;
  startedAt: string | null;
  finishedAt: string | null;
  sections: IrrigationZone[];
  notes: string | null;
}

export interface CreateIrrigationTurnRequest {
  sectorZoneId: number;
  irrigationDate: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  sectionZoneIds: number[];
  notes?: string | null;
}
