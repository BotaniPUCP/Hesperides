/** SPEC-107: reservas de jardines. Espejo de ReservationDtos del backend. */

/** El estado se calcula en el backend; nunca se guarda. */
export type ReservationState = 'UPCOMING' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED';

/** El uso del espacio se deriva de las marcas guardadas y del reloj (enmienda 11 nov 2026). */
export type ReservationUsage = 'NOT_RECORDED' | 'IN_USE' | 'NOT_IN_USE' | 'USED' | 'NOT_USED';

export type ReservationSeverity = 'CRITICAL' | 'WARNING';

export interface ReservationGardenRef {
  id: number;
  code: string;
  name: string;
  /** Las secciones del jardín; solo vienen llenas en la ficha, para enfocar el mapa. */
  sectionCodes: string[];
}

export interface ReservationOrganizationRef {
  code: string;
  name: string;
}

export interface ReservationContactRef {
  code: string;
  fullName: string;
  /** Rol del vínculo con la organización de la reserva (D-08b). Null sin rol. */
  role: string | null;
  mobile: string | null;
  extension: string | null;
}

/** Una fila del historial de responsables (D-02b); solo viene en la ficha. */
export interface ReservationResponsibleEntry {
  contact: Pick<ReservationContactRef, 'code' | 'fullName' | 'role'>;
  assignedAt: string;
  assignedBy: string;
}

/** Una fila del historial de confirmaciones o de usos; solo viene en la ficha. */
export interface ReservationFollowupEntry {
  value: boolean;
  at: string;
  by: string;
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
  /** La organización que pide el jardín (D-02). */
  requestedBy: ReservationOrganizationRef;
  /** Quien hizo el pedido, de «Pedido de»; fijo. */
  requester: ReservationContactRef;
  /** La organización que usará el jardín; null cuando es la misma que pide. */
  requestedFor: ReservationOrganizationRef | null;
  /** El contacto a cargo; puede cambiar, y cada cambio deja fila en el historial. */
  responsible: ReservationContactRef;
  /** Solo viene lleno en la ficha (GET /{code}). */
  responsibleHistory: ReservationResponsibleEntry[];
  /** Solo vienen llenos en la ficha (GET /{code}); en la agenda van vacíos. */
  confirmationHistory: ReservationFollowupEntry[];
  usageHistory: ReservationFollowupEntry[];
  startsAt: string;
  endsAt: string;
  purpose: string | null;
  state: ReservationState;
  cancelReason: string | null;
  /** El solicitante confirmó que usará el jardín (enmienda 11 nov 2026). */
  useConfirmed: boolean;
  /** El encargado marcó que el espacio está siendo usado. */
  spaceUsed: boolean;
  /** El uso derivado: las marcas más el reloj. */
  usageState: ReservationUsage;
  /** Si las ventanas de cada marca están abiertas ahora mismo. */
  canConfirm: boolean;
  canRecordUsage: boolean;
  version: number;
  /** Solo viene lleno al crear y editar. */
  warnings: ReservationWarning[];
}

/**
 * Al crear van los cuatro códigos; al editar `requestedByCode` y `requesterCode`
 * no se envían, porque quiénes pidieron no cambian (D-02).
 */
export interface ReservationInput {
  placeId: number;
  requestedByCode?: string;
  requesterCode?: string;
  requestedForCode: string | null;
  responsibleCode: string;
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

/** Una organización que aparece como «Pedido de» o «Para» en alguna reserva (D-08). */
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
