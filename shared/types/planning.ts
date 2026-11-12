/** SPEC-203: conjuntos de áreas verdes y planificación preventiva. Espejo de los DTO del backend. */

/** Cuántos ejemplares de un tipo (Palmera, Árbol…) tiene un conjunto. */
export interface TypeCount {
  label: string;
  count: number;
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

/**
 * Un ejemplar del catastro dentro de un conjunto. Sección y sector salen de su
 * posición: son nulos si está en una vereda o plaza, fuera de toda sección.
 */
export interface GreenAreaSetElement {
  id: number;
  code: string;
  displayName: string;
  typeLabel: string | null;
  sectionName: string | null;
  sectorId: number | null;
  sectorName: string | null;
}

export interface GreenAreaSetSummary {
  id: number;
  name: string;
  description: string | null;
  zoneCount: number;
  elementCount: number;
  /** Sus ejemplares por tipo, del más numeroso al menos. */
  specimenTypes: TypeCount[];
  version: number;
  updatedAt: string;
}

export interface GreenAreaSetDetail {
  id: number;
  name: string;
  description: string | null;
  version: number;
  zones: GreenAreaSetZone[];
  elements: GreenAreaSetElement[];
  /** Avisos al guardar; nunca impiden guardar. */
  warnings: string[];
}

export interface GreenAreaSetRequest {
  name: string;
  description: string | null;
  zoneIds: number[];
  /** Un conjunto lleva jardines, ejemplares o ambos. */
  elementIds: number[];
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

/** Una tarjeta de planificación: una frecuencia asignada a un conjunto. */
export interface PlanningRow {
  setId: number;
  setName: string;
  zoneCount: number;
  elementCount: number;
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
  openIntervention: { id: number; code: string; scheduledDate: string; startedDate: string | null } | null;
  estimatedDate: string | null;
  yearCount: number | null;
  suggestedDate: string | null;
  assignmentId: number;
  /** La regla asignada; null si la asignación quedó sin frecuencia. */
  ruleKey: string | null;
  /** Cuántas unidades (jardines y ejemplares) están al día por sí solas; null sin frecuencia. */
  upToDateCount: number | null;
  /** Cuántas unidades se atendieron por última vez en cada fecha, de la más reciente a la más antigua; null = nunca. */
  lastDates: { date: string | null; count: number }[];
  /** Las que faltan: les toca, están atrasadas o nunca se atendieron. */
  pendingZoneIds: number[];
  pendingElementIds: number[];
}

export interface RecentAttention {
  zoneId: number;
  displayName: string;
  lastDate: string;
  daysSinceLast: number;
  minDays: number;
}

/** Qué frecuencia se planifica en un conjunto (SPEC-203 §3.4). */
export interface PlanningAssignment {
  id: number;
  setId: number;
  setName: string;
  activityTypeItemId: number;
  activityLabel: string;
  /** La regla, no una versión; null si quedó sin frecuencia. */
  ruleKey: string | null;
  warnings: string[];
}

export interface PlanningAssignmentRequest {
  /** Solo al asignar; al cambiar una asignación se ignora. */
  setId?: number;
  frequencyId: number;
}
