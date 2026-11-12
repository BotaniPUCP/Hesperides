export type FrequencyRuleTypeCode =
  | 'INTERVAL_DAYS'
  | 'SEASONAL_PERIOD'
  | 'ANNUAL_WINDOW'
  | 'COVERAGE_CYCLE'
  | 'ON_DEMAND';

export type MaintenanceRegime = 'IN_HOUSE' | 'OUTSOURCED';

/** Todo el campus o un conjunto de áreas verdes (SPEC-203 D-07). */
/** `BY_SET`: una regla para conjuntos, que se asigna a cada uno en Planificación. */
export type MaintenanceScope = 'CAMPUS_WIDE' | 'BY_SET';

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
}

/** Estado de cumplimiento que devuelve el motor; no es un catalogo editable. */
export type ComplianceStatus =
  | 'ON_TARGET'
  | 'EARLY'
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
  /** La regla, compartida por todas sus versiones; a ella apuntan las asignaciones de Planificación. */
  ruleKey: string;
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
  /** A cuántos conjuntos está asignada en Planificación (SPEC-203 §3.4). */
  assignedSetCount: number;
  /** Avisos al guardar, como que una regla asignada pasó a tercerizada. */
  warnings?: string[];
}

export interface CreateMaintenanceFrequencyRequest {
  activityTypeItemId: number;
  regime: MaintenanceRegime;
  frequencyRuleTypeCode: FrequencyRuleTypeCode;
  scope: MaintenanceScope;
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
  locations?: LocationCompliance[];
}

export interface LocationExecution {
  interventionId: number;
  interventionCode: string;
  locationId: number;
  attemptNumber: number;
  targetKind: string;
  targetId: number;
  targetLabel: string;
  zoneId: number | null;
  placeId: number | null;
  completedAt: string;
  validatedAt: string;
  approvedAt: string;
  executionDate: string;
  approvalDate: string;
}

export interface LocationCompliance {
  targetKind: string;
  targetId: number;
  targetLabel: string;
  executions: LocationExecution[];
  segments: ComplianceSegment[];
}
