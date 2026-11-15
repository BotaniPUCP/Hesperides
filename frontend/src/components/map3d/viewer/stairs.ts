import type { BuildingModelManifest, BuildingStair } from '@shared/types';
import { inPlanPolygon, isPlanPoint } from './planPolygon';
import { flightTriangles, landingTriangles, STAIR_SLAB_M, wallTriangles, type Segment } from './stairMesh';

/**
 * Escaleras que reemplazan una parte de la malla de un edificio (SPEC-108 D-17): el SKP dibuja como un bloque
 * macizo lo que es una escalera abierta, y el bloque tapa el pasto. El visor quita el bloque, cierra el edificio
 * donde estaba pegado y dibuja la escalera; el GLB no se toca.
 */

const HEIGHT_TOLERANCE_M = 0.01;

function pointsOf(s: BuildingStair): unknown[] {
  return [...s.replaces.polygon, ...s.walls.flat(), ...s.flights.flatMap((f) => [...f.from, ...f.to]), ...s.landings.flatMap((l) => l.polygon)];
}

function validate(key: string, s: BuildingStair): void {
  if (!pointsOf(s).every(isPlanPoint)) throw new Error(`La escalera de ${key} tiene un punto que no son dos números finitos`);
  if (!(s.replaces.toM > s.replaces.fromM)) throw new Error(`La parte que reemplaza la escalera de ${key} no sube`);
  if (!s.landings.every((l) => Number.isFinite(l.atM))) throw new Error(`Un descanso de la escalera de ${key} no tiene cota`);
  for (const f of s.flights) {
    if (!(f.toM > f.fromM)) throw new Error(`Un tramo de la escalera de ${key} no sube`);
    if (!Number.isInteger(f.risers) || f.risers < 2) throw new Error(`Un tramo de la escalera de ${key} necesita dos o más contrahuellas enteras`);
    if ((f.toM - f.fromM) / f.risers >= STAIR_SLAB_M) throw new Error(`Una contrahuella de la escalera de ${key} mide lo que la losa o más`);
  }
}

/** Las escaleras del manifiesto, validadas: solo de mallas de edificio, con cotas que suben y peldaños que la losa sostiene. */
export function stairsOf(manifest: BuildingModelManifest): Map<string, BuildingStair> {
  const out = new Map<string, BuildingStair>();
  for (const [key, stair] of Object.entries(manifest.stairs ?? {})) {
    if (manifest.nodes[key] !== 'edificio') throw new Error(`La escalera de ${key} no es de la malla de un edificio del modelo`);
    validate(key, stair);
    out.set(key, stair);
  }
  return out;
}

/** Los triángulos que no caen enteros en el prisma de la parte reemplazada (planta y cotas), en su orden. */
function keptTriangles(p: Float32Array, { polygon, fromM, toM }: BuildingStair['replaces']): Float32Array {
  const inPlan = inPlanPolygon(polygon);
  const inPart = (v: number) => {
    const y = p[v + 1];
    if (y < fromM - HEIGHT_TOLERANCE_M || y > toM + HEIGHT_TOLERANCE_M) return false;
    return inPlan(p[v], -p[v + 2]);
  };
  const out: number[] = [];
  for (let t = 0; t < p.length; t += 9) {
    if (!(inPart(t) && inPart(t + 3) && inPart(t + 6))) for (let k = t; k < t + 9; k++) out.push(p[k]);
  }
  return Float32Array.from(out);
}

/**
 * La malla con su escalera: sin los triángulos que caen enteros en la parte reemplazada, con los muros que cierran
 * el edificio y, al final, la escalera. `stairFrom` es el primer vértice de la escalera: de ahí al final no es fachada.
 */
export function withStair(p: Float32Array, stair: BuildingStair, key: string): { positions: Float32Array; stairFrom: number } {
  const kept = keptTriangles(p, stair.replaces);
  if (kept.length === p.length) throw new Error(`La escalera de ${key} no reemplaza nada de su malla: el manifiesto no calza con el modelo`);
  const { fromM, toM } = stair.replaces;
  const walls = stair.walls.flatMap(([a, b]) => wallTriangles(a, b, fromM, toM));
  // Un descanso no lleva canto donde llega o arranca un tramo, ni contra un muro: ahí no se ve.
  const attached: Segment[] = [...stair.walls, ...stair.flights.flatMap((f) => [f.from, f.to])];
  const steps = [
    ...stair.flights.flatMap((f) => flightTriangles(f, fromM, stair.walls)),
    ...stair.landings.flatMap((l) => landingTriangles(l, attached)),
  ];
  const positions = new Float32Array(kept.length + walls.length + steps.length);
  positions.set(kept);
  positions.set(walls, kept.length);
  positions.set(steps, kept.length + walls.length);
  return { positions, stairFrom: (kept.length + walls.length) / 3 };
}
