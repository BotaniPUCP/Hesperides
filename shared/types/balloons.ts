/** SPEC-113 §3: globos del mapa. Espejo de BalloonDtos del backend. */

export type BalloonKind =
  | 'INCIDENT'
  | 'INTERVENTION'
  | 'IRRIGATION'
  | 'IRRIGATION_DUE'
  | 'RESERVATION'
  | 'BLOCKING_EVENT'
  | 'MACHINERY_CUT';

/** Línea de la ficha corta, ya en español: el navegador no interpreta estados. */
export interface BalloonCardLine {
  label: string;
  value: string;
}

export interface BalloonCard {
  title: string;
  status: string;
  lines: BalloonCardLine[];
  progress: { done: number; total: number } | null;
  photoUrl: string | null;
  /** Ruta del detalle en su módulo, que vuelve a comprobar permisos. */
  href: string;
}

export interface Balloon {
  /** Estable entre consultas mientras el origen no cambie. */
  id: string;
  kind: BalloonKind;
  /** INCIDENT: HIGH, MEDIUM, LOW o NONE. IRRIGATION_DUE: OVERDUE o DUE. */
  variant: string | null;
  attention: boolean;
  latitude: number;
  longitude: number;
  sectorId: number | null;
  memberCount: number;
  card: BalloonCard;
}

/** Un aviso de todo el campus para la franja del mapa (SPEC-114 D-06): «Hoy es feriado: …». */
export interface CampusNotice {
  typeCode: 'BLOCKING' | 'HOLIDAY';
  text: string;
}

export interface BalloonsResponse {
  generatedAt: string;
  /** Ya ordenados del más urgente al menos. */
  balloons: Balloon[];
  unavailableKinds: BalloonKind[];
  truncated: boolean;
  campusNotices: CampusNotice[];
}
