import type { SceneData } from '@/components/map3d/sceneData';

/** Un grupo de jardines y ejemplares cercanos entre sí, para recorrer un conjunto disperso. */
export interface SetCluster {
  zoneCodes: string[];
  specimenCodes: string[];
}

/** Dos unidades a menos de esta distancia (en metros, borde a borde) quedan en el mismo grupo. */
export const CLUSTER_GAP_M = 60;

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
  const groups = new Map<number, SetCluster>();
  units.forEach((u, i) => {
    const root = find(i);
    const g = groups.get(root) ?? { zoneCodes: [], specimenCodes: [] };
    (u.kind === 'zone' ? g.zoneCodes : g.specimenCodes).push(u.code);
    groups.set(root, g);
  });
  return [...groups.values()].sort((a, b) =>
    (b.zoneCodes.length + b.specimenCodes.length) - (a.zoneCodes.length + a.specimenCodes.length));
}
