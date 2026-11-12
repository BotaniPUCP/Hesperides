import type { SceneData } from '@/components/map3d/sceneData';

/** Un grupo de jardines y ejemplares cercanos entre sí, para recorrer un conjunto disperso. */
export interface SetCluster {
  zoneCodes: string[];
  specimenCodes: string[];
}

/** Dos unidades a menos de esta distancia (en metros, borde a borde) quedan en el mismo grupo. */
export const CLUSTER_GAP_M = 60;

/**
 * Lo más ancho (en metros, en cualquier dirección) que puede ser un grupo. La cercanía encadena:
 * jardines seguidos de punta a punta del campus quedan en un solo grupo y encuadrarlo es ver el
 * campus entero. Un grupo más ancho se parte en bloques de este tamaño.
 */
export const MAX_GROUP_SPAN_M = 250;

const LAYERS = ['greenAreas', 'xerophytic', 'reserve'] as const;

interface Unit {
  kind: 'zone' | 'specimen';
  code: string;
  minX: number; maxX: number; minZ: number; maxZ: number;
}

function gap(a: Unit, b: Unit): number {
  const dx = Math.max(0, a.minX - b.maxX, b.minX - a.maxX);
  const dz = Math.max(0, a.minZ - b.maxZ, b.minZ - a.maxZ);
  return Math.hypot(dx, dz);
}

/**
 * Agrupa por cercanía lo que el conjunto tiene en el mapa: un jardín cuenta por su
 * contorno, un ejemplar por su punto. Los grupos salen del más grande al más chico.
 * Lo que no está en el mapa no se agrupa.
 */
export function setClusters(scene: SceneData, zoneCodes: readonly string[], specimenCodes: readonly string[],
  maxGap: number = CLUSTER_GAP_M): SetCluster[] {
  const wantedZones = new Set(zoneCodes);
  const wantedPlants = new Set(specimenCodes);
  const units: Unit[] = [];
  for (const layer of LAYERS) {
    for (const zone of scene[layer]) {
      if (!wantedZones.has(zone.props.code)) continue;
      let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
      for (const polygon of zone.g) {
        const ring = polygon[0] ?? [];
        for (let i = 0; i < ring.length; i += 2) {
          minX = Math.min(minX, ring[i]); maxX = Math.max(maxX, ring[i]);
          minZ = Math.min(minZ, -ring[i + 1]); maxZ = Math.max(maxZ, -ring[i + 1]);
        }
      }
      if (minX !== Infinity) units.push({ kind: 'zone', code: zone.props.code, minX, maxX, minZ, maxZ });
    }
  }
  for (const plant of scene.vegetation) {
    if (!wantedPlants.has(plant.props.code)) continue;
    const x = plant.p[0], z = -plant.p[1];
    units.push({ kind: 'specimen', code: plant.props.code, minX: x, maxX: x, minZ: z, maxZ: z });
  }

  // Unión por cercanía: dos unidades cerca quedan juntas, y lo cercano a cualquiera de ellas también.
  const parent = units.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < units.length; i++) {
    for (let j = i + 1; j < units.length; j++) {
      if (gap(units[i], units[j]) <= maxGap) parent[find(i)] = find(j);
    }
  }
  const byRoot = new Map<number, Unit[]>();
  units.forEach((u, i) => {
    const root = find(i);
    byRoot.set(root, [...(byRoot.get(root) ?? []), u]);
  });
  return [...byRoot.values()].flatMap(splitWide).map(toCluster).sort((a, b) =>
    (b.zoneCodes.length + b.specimenCodes.length) - (a.zoneCodes.length + a.specimenCodes.length));
}

/** Un grupo más ancho que {@link MAX_GROUP_SPAN_M} se parte en bloques; cada unidad va al de su centro. */
function splitWide(group: Unit[]): Unit[][] {
  const minX = Math.min(...group.map((u) => u.minX));
  const maxX = Math.max(...group.map((u) => u.maxX));
  const minZ = Math.min(...group.map((u) => u.minZ));
  const maxZ = Math.max(...group.map((u) => u.maxZ));
  const cols = Math.ceil((maxX - minX) / MAX_GROUP_SPAN_M);
  const rows = Math.ceil((maxZ - minZ) / MAX_GROUP_SPAN_M);
  if (cols <= 1 && rows <= 1) return [group];
  const cells = new Map<string, Unit[]>();
  for (const u of group) {
    const col = Math.min(cols - 1, Math.max(0, Math.floor(((u.minX + u.maxX) / 2 - minX) / MAX_GROUP_SPAN_M)));
    const row = Math.min(rows - 1, Math.max(0, Math.floor(((u.minZ + u.maxZ) / 2 - minZ) / MAX_GROUP_SPAN_M)));
    const key = `${row}:${col}`;
    cells.set(key, [...(cells.get(key) ?? []), u]);
  }
  return [...cells.values()];
}

function toCluster(group: Unit[]): SetCluster {
  return {
    zoneCodes: group.filter((u) => u.kind === 'zone').map((u) => u.code),
    specimenCodes: group.filter((u) => u.kind === 'specimen').map((u) => u.code),
  };
}
