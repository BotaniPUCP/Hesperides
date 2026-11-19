import type { SceneData } from '@/components/map3d/sceneData';

/** Un grupo de jardines y ejemplares cercanos entre sí, para recorrer un conjunto disperso. */
export interface SetCluster {
  zoneCodes: string[];
  specimenCodes: string[];
}

/** Dos unidades a menos de esta distancia (en metros, borde a borde) quedan en el mismo grupo. */
export const CLUSTER_GAP_M = 60;

/**
 * Lo más ancho (en metros, en cualquier dirección) que puede ser un grupo: más o menos medio campus.
 * La cercanía encadena: jardines seguidos de punta a punta del campus quedan en un solo grupo y
 * encuadrarlo es ver el campus entero. Un grupo más ancho se reparte siguiendo sus separaciones.
 */
export const MAX_GROUP_SPAN_M = 500;

const LAYERS = ['greenAreas', 'xerophytic', 'reserve'] as const;

/** Lo que ocupa algo en el plano, en metros. */
interface Box { minX: number; maxX: number; minZ: number; maxZ: number }

interface Unit extends Box {
  kind: 'zone' | 'specimen';
  code: string;
}

/** Distancia de borde a borde entre dos rectángulos; cero si se tocan. */
function gap(a: Box, b: Box): number {
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

const union = (a: Box, b: Box): Box => ({
  minX: Math.min(a.minX, b.minX), maxX: Math.max(a.maxX, b.maxX), minZ: Math.min(a.minZ, b.minZ), maxZ: Math.max(a.maxZ, b.maxZ),
});
const span = (b: Box) => Math.max(b.maxX - b.minX, b.maxZ - b.minZ);

/**
 * Un grupo más ancho que {@link MAX_GROUP_SPAN_M} se reparte siguiendo sus separaciones naturales
 * (calles, espacios entre jardines), no con una grilla que cortaría una zona por la mitad: se parte
 * de cada unidad sola y se van juntando las dos partes más cercanas mientras el resultado quepa.
 */
function splitWide(group: Unit[]): Unit[][] {
  if (span(group.reduce<Box>((b, u) => union(b, u), group[0])) <= MAX_GROUP_SPAN_M) return [group];
  const parts = group.map((u) => ({ units: [u], box: { minX: u.minX, maxX: u.maxX, minZ: u.minZ, maxZ: u.maxZ } }));
  for (;;) {
    let best: { gap: number; i: number; j: number; box: Box } | null = null;
    for (let i = 0; i < parts.length; i++) {
      for (let j = i + 1; j < parts.length; j++) {
        const d = gap(parts[i].box, parts[j].box);
        if (best && d >= best.gap) continue;
        const merged = union(parts[i].box, parts[j].box);
        if (span(merged) <= MAX_GROUP_SPAN_M) best = { gap: d, i, j, box: merged };
      }
    }
    if (!best) return parts.map((p) => p.units);
    parts[best.i] = { units: [...parts[best.i].units, ...parts[best.j].units], box: best.box };
    parts.splice(best.j, 1);
  }
}

function toCluster(group: Unit[]): SetCluster {
  return {
    zoneCodes: group.filter((u) => u.kind === 'zone').map((u) => u.code),
    specimenCodes: group.filter((u) => u.kind === 'specimen').map((u) => u.code),
  };
}
