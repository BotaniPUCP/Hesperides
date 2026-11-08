/** M7/D-01: contratos de registro, sin afirmar cobertura D-02. */
export interface IrrigationZone {
  id: number;
  code: string;
  name: string;
}

export interface IrrigationWaterDetailsRequest {
  sourceCode: string;
  methodCode: string;
  tankerTrips: number | null;
  tankerVolumeM3: number | null;
}

export interface IrrigationWaterDetails {
  sourceLabel: string;
  methodLabel: string;
  tankerTrips: number | null;
  tankerVolumeM3: number | null;
}

export interface IrrigationOperatingWindow {
  start: string;
  end: string;
}

export interface IrrigationCoverageSection {
  id: number;
  code: string;
  name: string;
  sectorName: string;
  areaM2: number | null;
  lastIrrigatedOn: string | null;
  daysWithoutIrrigation: number | null;
  irrigatedThisMonth: boolean;
}

export interface IrrigationCoverage {
  monthStart: string;
  asOf: string;
  measuredAreaM2: number;
  irrigatedAreaM2: number;
  coveragePercent: number | null;
  maxDaysWithoutIrrigation: number | null;
  sections: IrrigationCoverageSection[];
}

export interface CreateIrrigationPumpReadingRequest {
  readingDate: string;
  initialMeterHours: number;
  finalMeterHours: number;
  reservoirLevelPercent: number;
}

export interface IrrigationPumpReading extends CreateIrrigationPumpReadingRequest {
  id: number;
  recordedByUserId: number;
  operationHours: number;
  flowM3PerHour: number;
  estimatedVolumeM3: number;
  dailyLimitHours: number;
  exceedsDailyLimit: boolean;
}

export interface IrrigationPumpReadings {
  flowM3PerHour: number | null;
  dailyLimitHours: number | null;
  readings: IrrigationPumpReading[];
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
  waterDetails?: IrrigationWaterDetails | null;
  windowExceptionLabel?: string | null;
}

export interface CreateIrrigationTurnRequest {
  sectorZoneId: number;
  irrigationDate: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  sectionZoneIds: number[];
  notes?: string | null;
  waterDetails?: IrrigationWaterDetailsRequest | null;
  windowExceptionCode?: string | null;
}
