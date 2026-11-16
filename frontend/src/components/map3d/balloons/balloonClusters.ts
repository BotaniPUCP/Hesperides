import type { Balloon } from '@shared/types';

/**
 * Lo que se decide de los globos sin three.js ni DOM (SPEC-113 §5.4 y §7.1): qué dibujo
 * lleva cada uno, cómo se juntan por sector de lejos y cómo se juntan los que se pisan de
 * cerca. Los globos llegan del servidor ordenados por urgencia, y ese orden manda.
 */

const ICON_DIR = '/map/balloons/';

const INCIDENT_ICON: Record<string, string> = {
  HIGH: 'incidencia-alta', MEDIUM: 'incidencia-media', LOW: 'incidencia-baja', NONE: 'incidencia-sin-urgencia',
};

const KIND_ICON: Record<Balloon['kind'], string> = {
  INCIDENT: 'incidencia-sin-urgencia',
  INTERVENTION: 'intervencion-en-curso',
  IRRIGATION: 'riego-en-curso',
  IRRIGATION_DUE: 'seccion-por-regar',
  RESERVATION: 'reserva-en-curso',
  BLOCKING_EVENT: 'evento-bloqueante',
  MACHINERY_CUT: 'corte-maquinaria-pendiente',
};

const INCIDENT_NAME: Record<string, string> = {
  HIGH: 'Incidencia alta', MEDIUM: 'Incidencia media', LOW: 'Incidencia baja', NONE: 'Incidencia sin urgencia',
};

export const KIND_NAME: Record<Balloon['kind'], string> = {
  INCIDENT: 'Incidencia abierta',
  INTERVENTION: 'Intervención en curso',
  IRRIGATION: 'Riego en curso o de hoy',
  IRRIGATION_DUE: 'Sección por regar',
  RESERVATION: 'Reserva en curso',
  BLOCKING_EVENT: 'Evento bloqueante',
  MACHINERY_CUT: 'Corte con maquinaria',
};

/** El color del borde de cada globo de atención: el punto del grupo lo repite. */
const ATTENTION_COLOR: Record<string, string> = {
  'INCIDENT:HIGH': '#E53935', 'INCIDENT:MEDIUM': '#FB8C00', 'INCIDENT:LOW': '#FDD835', 'INCIDENT:NONE': '#FFFFFF',
  'IRRIGATION_DUE:OVERDUE': '#F57C00', 'IRRIGATION_DUE:DUE': '#F57C00',
};

export const GROUP_ICON = `${ICON_DIR}grupo.svg`;

export function balloonIcon(b: Balloon): string {
  const name = b.kind === 'INCIDENT' ? INCIDENT_ICON[b.variant ?? 'NONE'] ?? INCIDENT_ICON.NONE : KIND_ICON[b.kind];
  return `${ICON_DIR}${name}.svg`;
}

export function balloonName(b: Balloon): string {
  return b.kind === 'INCIDENT' ? INCIDENT_NAME[b.variant ?? 'NONE'] ?? KIND_NAME.INCIDENT : KIND_NAME[b.kind];
}

/** «Incidencia alta: Rama caída sobre la vereda». */
export function balloonLabel(b: Balloon): string {
  return `${balloonName(b)}: ${b.card.title}`;
}

export interface SectorGroup {
  key: string;
  sectorId: number | null;
  members: Balloon[];
}

/** De lejos, un grupo por sector; los que no caen en ninguno, en «Otros». */
export function groupBySector(balloons: readonly Balloon[]): SectorGroup[] {
  const groups = new Map<string, SectorGroup>();
  for (const b of balloons) {
    const key = `sector:${b.sectorId ?? 'otros'}`;
    const group = groups.get(key) ?? { key, sectorId: b.sectorId, members: [] };
    group.members.push(b);
    groups.set(key, group);
  }
  const others = groups.get('sector:otros');
  groups.delete('sector:otros');
  return others ? [...groups.values(), others] : [...groups.values()];
}

export interface ScreenBalloon {
  balloon: Balloon;
  /** Punta de la cola en pantalla, en píxeles. */
  x: number;
  y: number;
}

export interface ScreenCluster {
  x: number;
  y: number;
  members: Balloon[];
}

/**
 * De cerca, los globos que se pisan se juntan en el sitio del más urgente, igual que las
 * etiquetas (SPEC-102): el primero que llega se queda con su sitio.
 */
export function mergeOverlapping(items: readonly ScreenBalloon[], size: { w: number; h: number }): ScreenCluster[] {
  const clusters: ScreenCluster[] = [];
  for (const item of items) {
    const hit = clusters.find((c) => Math.abs(c.x - item.x) < size.w && Math.abs(c.y - item.y) < size.h);
    if (hit) hit.members.push(item.balloon);
    else clusters.push({ x: item.x, y: item.y, members: [item.balloon] });
  }
  return clusters;
}

/** El color de la atención más urgente de un grupo; nulo si nadie en él pide atención. */
export function attentionDot(members: readonly Balloon[]): string | null {
  const first = members.find((m) => m.attention);
  return first ? ATTENTION_COLOR[`${first.kind}:${first.variant ?? 'NONE'}`] ?? null : null;
}

/**
 * Desde esta distancia de la cámara (m) el globo deja de quedarse fijo en píxeles y crece con el
 * mapa: así, al acercarse, no se ve cada vez más chico frente a los jardines.
 */
export const BALLOON_GROW_FROM_M = 350;
/** Tope del crecimiento: el doble de su tamaño normal. */
export const BALLOON_MAX_SCALE = 2;

export function balloonScale(cameraDistance: number): number {
  return Math.min(BALLOON_MAX_SCALE, Math.max(1, BALLOON_GROW_FROM_M / Math.max(cameraDistance, 1)));
}

/**
 * El miembro más cercano al centro de un grupo: ahí se clava el globo del grupo. El promedio de
 * dos jardines puede caer sobre un edificio; un miembro siempre está sobre su jardín (SPEC-113 §5.3b).
 */
export function memberNearestCenter(points: readonly { x: number; z: number }[]): number {
  const cx = points.reduce((sum, p) => sum + p.x, 0) / points.length;
  const cz = points.reduce((sum, p) => sum + p.z, 0) / points.length;
  let best = 0;
  points.forEach((p, i) => {
    if (Math.hypot(p.x - cx, p.z - cz) < Math.hypot(points[best].x - cx, points[best].z - cz)) best = i;
  });
  return best;
}
