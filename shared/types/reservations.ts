/** SPEC-107: reservas de jardines. Espejo de ReservationDtos del backend. */

/** El estado se calcula en el backend; nunca se guarda. */
export type ReservationState = 'UPCOMING' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED';

export type ReservationSeverity = 'CRITICAL' | 'WARNING';

export interface ReservationGardenRef {
  id: number;
  code: string;
  name: string;
}

export interface ReservationOrganizationRef {
  code: string;
  name: string;
}

export interface ReservationContactRef {
  code: string;
  fullName: string;
  mobile: string | null;
  extension: string | null;
}

/**
 * Un aviso que nunca bloquea (D-04, D-07). El texto llega armado del backend
 * porque lleva nombres, fechas y distancias; el frontend lo muestra tal cual.
 */
export interface ReservationWarning {
  kind: string;
  severity: ReservationSeverity;
  text: string;
  reservationCode: string | null;
  interventionId: number | null;
}

export interface Reservation {
  code: string;
  place: ReservationGardenRef;
  organization: ReservationOrganizationRef;
  contact: ReservationContactRef | null;
  startsAt: string;
  endsAt: string;
  purpose: string | null;
  state: ReservationState;
  cancelReason: string | null;
  version: number;
  /** Solo viene lleno al crear y editar. */
  warnings: ReservationWarning[];
}

export interface ReservationInput {
  placeId: number;
  organizationCode: string;
  contactCode: string | null;
  startsAt: string;
  endsAt: string;
  purpose: string | null;
  /** null al crear; la versión leída al editar. */
  version: number | null;
}

export interface ReservationPage {
  page: number;
  size: number;
  total: number;
  items: Reservation[];
}

/** Un jardín prestable para el selector: el lugar y sus alias del calendario de la OSG. */
export interface ReservationGardenOption {
  id: number;
  code: string;
  name: string;
  aliases: string[];
}

/** Una organización con al menos una reserva, para el filtro (D-08). */
export interface ReservationOrganizationOption {
  code: string;
  name: string;
}

export interface ReservationCheckQuery {
  placeId: number;
  startsAt: string;
  endsAt: string;
  excludeCode?: string;
}

export interface ReservationNearbyQuery {
  date: string;
  zoneIds?: number[];
  placeIds?: number[];
  /** Coordenadas sueltas en «lat,lon;lat,lon». */
  points?: string;
  elementIds?: number[];
  /** Códigos de ejemplar que el formulario conoce antes de guardar. */
  elementCodes?: string[];
}

/** Registro masivo (SPEC-107 §5.4): los avisos no bloquean; los errores sí. */
export type ReservationImportRowAction = 'CREATE' | 'WARNING' | 'ERROR';

export interface ReservationImportRowIssue {
  line: number;
  column: string;
  code: string;
  detail: string | null;
}

export interface ReservationImportPlannedRow {
  line: number;
  garden: string | null;
  organization: string | null;
  action: ReservationImportRowAction;
  issues: ReservationImportRowIssue[];
  warnings: ReservationWarning[];
}

export interface ReservationImportPlan {
  batchId: number;
  kind: 'reservations';
  totalRows: number;
  toCreate: number;
  toWarning: number;
  errors: number;
  rows: ReservationImportPlannedRow[];
  canConfirm: boolean;
  expiresAt: string;
}

export interface ReservationImportOutcome {
  batchId: number;
  created: number;
  createdCodes: string[];
}
