import * as THREE from 'three';
import type { PlanPoint, StairFlight, StairLanding } from '@shared/types';

/**
 * La geometría de una escalera que reemplaza una parte del modelo (SPEC-108 D-17): tramos, descansos y los muros
 * que cierran el edificio. Funciones puras: reciben puntos del plano en metros alrededor del anclaje y devuelven
 * triángulos sin índice en el marco del modelo (x este, y arriba, z = −norte).
 */

/** Grosor de la losa bajo los peldaños y los descansos. Toda contrahuella mide menos: la cara de abajo no corta un peldaño. */
export const STAIR_SLAB_M = 0.2;
/** Un borde a menos de esto de un segmento va pegado a él: el manifiesto redondea al milímetro. */
const ATTACHED_M = 0.02;
/** Una cota a menos de esto del suelo es el suelo. */
const LEVEL_M = 1e-6;

export type Segment = readonly [PlanPoint, PlanPoint];
/** Un punto del plano con su cota: [este, norte, cota]. */
type Corner = readonly [number, number, number];

const at = (p: PlanPoint, z: number): Corner => [p[0], p[1], z];
const lerp = (a: PlanPoint, b: PlanPoint, t: number): PlanPoint => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

function push(out: number[], ...corners: Corner[]) {
  for (const [east, north, z] of corners) out.push(east, z, -north);
}

/** Dos triángulos: a-b-c y a-c-d. */
function quad(out: number[], a: Corner, b: Corner, c: Corner, d: Corner) {
  push(out, a, b, c, a, c, d);
}

export function distanceToSegment(p: PlanPoint, [a, b]: Segment): number {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}

/** Si el borde a-b va pegado a alguno de los segmentos: sus dos puntas caen sobre el mismo. */
function liesOn(a: PlanPoint, b: PlanPoint, segments: readonly Segment[]): boolean {
  return segments.some((s) => distanceToSegment(a, s) < ATTACHED_M && distanceToSegment(b, s) < ATTACHED_M);
}

/** Un muro vertical sobre el segmento, entre dos cotas. */
export function wallTriangles(from: PlanPoint, to: PlanPoint, bottomM: number, topM: number): number[] {
  const out: number[] = [];
  quad(out, at(from, bottomM), at(to, bottomM), at(to, topM), at(from, topM));
  return out;
}

/**
 * Un tramo recto: contrahuellas, huellas, la cara inclinada de abajo y los costados que no dan a un muro. La cara
 * de abajo arranca en el suelo (`groundM`) si el tramo sale de él, y bajo la losa del descanso si sale de uno: así
 * el tramo solo toca el suelo en la arista donde arranca.
 */
export function flightTriangles(f: StairFlight, groundM: number, walls: readonly Segment[]): number[] {
  const out: number[] = [];
  const riser = (f.toM - f.fromM) / f.risers;
  const treads = f.risers - 1;
  const left = (s: number) => lerp(f.from[0], f.to[0], s), right = (s: number) => lerp(f.from[1], f.to[1], s);
  const start = f.fromM - groundM > LEVEL_M ? f.fromM - STAIR_SLAB_M : f.fromM;
  const underside = (s: number) => start + (f.toM - STAIR_SLAB_M - start) * s;
  const sides = [[left, f.from[0], f.to[0]], [right, f.from[1], f.to[1]]] as const;
  const openSides = sides.filter(([, a, b]) => !liesOn(a, b, walls)).map(([side]) => side);
  for (let k = 0; k <= treads; k++) {
    const s = k / treads, z = f.fromM + k * riser, top = z + riser;
    quad(out, at(left(s), z), at(right(s), z), at(right(s), top), at(left(s), top));
    // La última contrahuella sube al descanso: no lleva huella.
    if (k === treads) break;
    const next = (k + 1) / treads;
    quad(out, at(left(s), top), at(right(s), top), at(right(next), top), at(left(next), top));
    for (const side of openSides) quad(out, at(side(s), underside(s)), at(side(next), underside(next)), at(side(next), top), at(side(s), top));
  }
  quad(out, at(left(0), underside(0)), at(left(1), underside(1)), at(right(1), underside(1)), at(right(0), underside(0)));
  return out;
}

/** Una losa a su cota, con canto en los bordes que no van pegados a un tramo o a un muro. */
export function landingTriangles(l: StairLanding, attached: readonly Segment[]): number[] {
  const out: number[] = [];
  const ring = l.polygon, bottom = l.atM - STAIR_SLAB_M;
  for (const [i, j, k] of THREE.ShapeUtils.triangulateShape(ring.map(([x, y]) => new THREE.Vector2(x, y)), [])) {
    push(out, at(ring[i], l.atM), at(ring[j], l.atM), at(ring[k], l.atM));
    push(out, at(ring[i], bottom), at(ring[k], bottom), at(ring[j], bottom));
  }
  ring.forEach((a, i) => {
    const b = ring[(i + 1) % ring.length];
    if (!liesOn(a, b, attached)) quad(out, at(a, bottom), at(b, bottom), at(b, l.atM), at(a, l.atM));
  });
  return out;
}
