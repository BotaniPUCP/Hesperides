import type { PlanPoint } from '@shared/types';
import { insideRing } from './picking';
import { distanceToSegment, type Segment } from './stairMesh';

/** Un vértice a menos de esto del borde de un polígono del manifiesto cae en él: el manifiesto redondea al milímetro. */
export const PLAN_TOLERANCE_M = 0.02;

/** Un punto del manifiesto bien escrito: dos números finitos. */
export const isPlanPoint = (p: unknown): p is PlanPoint => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite);

/** Si un punto en planta (este, norte) cae en el polígono o a menos de la tolerancia de su borde (SPEC-108 D-17 y D-18). */
export function inPlanPolygon(polygon: PlanPoint[]): (east: number, north: number) => boolean {
  const ring = polygon.flat();
  const edges = polygon.map((a, i): Segment => [a, polygon[(i + 1) % polygon.length]]);
  return (east, north) => insideRing(east, north, ring) || edges.some((e) => distanceToSegment([east, north], e) < PLAN_TOLERANCE_M);
}
