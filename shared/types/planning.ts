/** SPEC-203: conjuntos de áreas verdes y planificación preventiva. Espejo de los DTO del backend. */

export interface ActivityRef {
  id: number;
  label: string;
}

export interface GreenAreaSetZone {
  id: number;
  code: string;
  name: string;
  /** El nombre del lugar que contorna la sección, si lo tiene; si no, el de la sección. */
  displayName: string;
  landscapeCode: string | null;
  sectorName: string | null;
}

export interface GreenAreaSetSummary {
  id: number;
  name: string;
  description: string | null;
  zoneCount: number;
  activities: ActivityRef[];
  version: number;
}

export interface GreenAreaSetDetail {
  id: number;
  name: string;
  description: string | null;
  version: number;
  activities: ActivityRef[];
  zones: GreenAreaSetZone[];
  /** Avisos de cruce de frecuencias propias (D-08); nunca impiden guardar. */
  warnings: string[];
}

export interface GreenAreaSetRequest {
  name: string;
  description: string | null;
  zoneIds: number[];
  activityTypeItemIds: number[];
  /** Solo al editar: la versión que se vio al abrir el formulario. */
  version?: number;
}

/** Resultado de un cálculo, no un catálogo editable. */
export type PlanningState =
  | 'OVERDUE'
  | 'DUE'
  | 'IN_PROGRESS'
  | 'SCHEDULED'
  | 'NOT_DUE'
  | 'DONE_FOR_PERIOD'
  | 'NOT_CONFIGURED';

export interface PlanningRhythm {
  minDays: number | null;
  maxDays: number | null;
  seasonLabel: string | null;
  annualTarget: number | null;
  windowStartMonth: number | null;
  windowEndMonth: number | null;
}

export interface PlanningRow {
  setId: number;
  setName: string;
  zoneCount: number;
  activityTypeItemId: number;
  activityLabel: string | null;
  ruleKind: string | null;
  ownRule: boolean;
  rhythm: PlanningRhythm | null;
  state: PlanningState;
  /** Faltan (NOT_DUE), quedan (DUE), días tarde (OVERDUE) o jardines que faltan (IN_PROGRESS). */
  days: number | null;
  lastDate: string | null;
  daysSinceLast: number | null;
  progress: { done: number; total: number } | null;
  neverAttendedCount: number;
  openIntervention: { id: number; code: string; scheduledDate: string } | null;
  estimatedDate: string | null;
  yearCount: number | null;
  suggestedDate: string | null;
}

export interface RecentAttention {
  zoneId: number;
  displayName: string;
  lastDate: string;
  daysSinceLast: number;
  minDays: number;
}
