export type FrequencyRuleTypeCode =
  | 'INTERVAL_DAYS'
  | 'SEASONAL_PERIOD'
  | 'ANNUAL_WINDOW'
  | 'COVERAGE_CYCLE'
  | 'ON_DEMAND';

export type MaintenanceRegime = 'IN_HOUSE' | 'OUTSOURCED';

export type MaintenanceScope = 'CAMPUS_WIDE' | 'BY_SECTOR' | 'BY_ZONE';

export type SeasonKey = 'VERANO' | 'OTONO' | 'INVIERNO' | 'PRIMAVERA';

/**
 * El intervalo que rige durante una estacion.
 *
 * Sustituye al `seasonModifier` de texto que el formulario componia. La
 * diferencia no es de formato: estos numeros los evalua el motor de
 * cumplimiento del backend, y aquella cadena solo se podia mostrar.
 */
export interface SeasonalInterval {
  season: SeasonKey;
  startMonth: number;
  endMonth: number;
  minDaysInterval: number;
  maxDaysInterval: number;
  /** El intervalo de manual, que suele diferir del operativo. */
  targetDaysInterval?: number | null;
}

/** Estado de cumplimiento que devuelve el motor; no es un catalogo editable. */
export type ComplianceStatus =
  | 'ON_TARGET'
  | 'WITHIN_TOLERANCE'
  | 'OVERDUE'
  | 'NOT_APPLICABLE'
  | 'NOT_CONFIGURED';

export interface ActivityTypeSummary {
  id: number;
  code: string;
  label: string;
  parentCode?: string | null;
}

export interface FrequencyRuleTypeSummary {
  id: number;
  code: FrequencyRuleTypeCode;
  label: string;
}

export interface MaintenanceFrequency {
  id: number;
  activityType: ActivityTypeSummary;
  regime: MaintenanceRegime;
  frequencyRuleType: FrequencyRuleTypeSummary;
  scope: MaintenanceScope;
  zoneId: number | null;
  targetDaysInterval: number | null;
  minDaysInterval: number | null;
  maxDaysInterval: number | null;
  annualTargetCount: number | null;
  coverageTargetDays: number | null;
  estimatedDurationDays: number | null;
  /** Ventana anual; `startMonth > endMonth` es valido y cruza el fin de ano. */
  seasonStartMonth: number | null;
  seasonEndMonth: number | null;
  /** Vacio significa "uniforme todo el ano". */
  seasons: SeasonalInterval[];
  notes: string | null;
  validFrom: string;
  /** `null` es la version vigente. */
  validTo: string | null;
  current: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMaintenanceFrequencyRequest {
  activityTypeItemId: number;
  regime: MaintenanceRegime;
  frequencyRuleTypeCode: FrequencyRuleTypeCode;
  scope: MaintenanceScope;
  zoneId?: number | null;
  targetDaysInterval?: number | null;
  minDaysInterval?: number | null;
  maxDaysInterval?: number | null;
  annualTargetCount?: number | null;
  coverageTargetDays?: number | null;
  estimatedDurationDays?: number | null;
  seasonStartMonth?: number | null;
  seasonEndMonth?: number | null;
  seasons?: SeasonalInterval[] | null;
  notes?: string | null;
}

/**
 * Ojo con el verbo: este PUT no actualiza en sitio, **versiona**. Cierra la
 * frecuencia vigente y crea una nueva, salvo que se haya creado hoy. El id de
 * la respuesta puede diferir del que se envio.
 */
export interface UpdateMaintenanceFrequencyRequest {
  regime?: MaintenanceRegime;
  frequencyRuleTypeCode?: FrequencyRuleTypeCode;
  scope?: MaintenanceScope;
  zoneId?: number | null;
  targetDaysInterval?: number | null;
  minDaysInterval?: number | null;
  maxDaysInterval?: number | null;
  annualTargetCount?: number | null;
  coverageTargetDays?: number | null;
  estimatedDurationDays?: number | null;
  seasonStartMonth?: number | null;
  seasonEndMonth?: number | null;
  /** `null` deja las estaciones como estan; `[]` las elimina. */
  seasons?: SeasonalInterval[] | null;
  notes?: string | null;
  active?: boolean;
}

/** Un tramo evaluado con una version concreta de la regla. */
export interface ComplianceSegment {
  status: ComplianceStatus;
  /** Que version juzgo este tramo: lo que permite auditar el veredicto. */
  evaluatedWithConfigId: number | null;
  observedValue: number | null;
  expectedValue: number | null;
  toleranceLimit: number | null;
  lastExecutionDate: string | null;
  periodStart: string;
  periodEnd: string;
  season: string | null;
  prorated: boolean;
  outOfSeason: number;
  explanation: string;
}

export interface ComplianceReport {
  activityTypeItemId: number;
  activityTypeLabel: string;
  regime: MaintenanceRegime;
  ruleTypeCode: FrequencyRuleTypeCode;
  from: string;
  to: string;
  /** Un tramo por version vigente en el periodo. No se promedian. */
  segments: ComplianceSegment[];
}
