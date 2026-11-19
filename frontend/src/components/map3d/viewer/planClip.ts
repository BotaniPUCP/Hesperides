import * as THREE from 'three';
import type { Polygon } from '../sceneData';

/** Recortes en planta entre polígonos convexos: los usa el piso que se abre sobre los céspedes (D-19). */

export type P = [number, number];
export type Box = [number, number, number, number];

/** Por debajo de este área en planta, una figura no tiene planta (un muro o un resto del recorte). */
export const MIN_PLAN_AREA_M2 = 1e-6;

export const cross = (a: P, b: P, c: P) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);

export const signedArea = (ps: P[]) => ps.reduce((s, p, i) => s + cross([0, 0], p, ps[(i + 1) % ps.length]), 0) / 2;

export function boxOf(points: P[]): Box {
  const xs = points.map((p) => p[0]), ys = points.map((p) => p[1]);
  return [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
}

export const overlaps = (a: Box, b: Box) => a[0] < b[1] && b[0] < a[1] && a[2] < b[3] && b[2] < a[3];

/** Un anillo plano (x0, y0, x1, y1…) sin el punto que repite el primero al cerrarse. */
export function ringPoints(ring: number[]): P[] {
  const points: P[] = [];
  for (let i = 0; i < ring.length; i += 2) points.push([ring[i], ring[i + 1]]);
  const [first, last] = [points[0], points[points.length - 1]];
  if (points.length > 1 && first[0] === last[0] && first[1] === last[1]) points.pop();
  return points;
}

/** Los triángulos de un polígono con sus huecos: así cada recorte es entre dos figuras convexas. */
export function triangulated(g: Polygon[]): P[][] {
  return g.flatMap((polygon) => {
    const [outer, ...holes] = polygon.map(ringPoints);
    const vec = (ps: P[]) => ps.map(([x, y]) => new THREE.Vector2(x, y));
    const all = [outer, ...holes].flat();
    return THREE.ShapeUtils.triangulateShape(vec(outer), holes.map(vec)).map((t) => t.map((k) => all[k]));
  });
}

/** Las dos partes de un polígono convexo a cada lado de la recta a→b: [izquierda, derecha]. */
function split(poly: P[], a: P, b: P): [P[], P[]] {
  const left: P[] = [], right: P[] = [];
  poly.forEach((p, i) => {
    const q = poly[(i + 1) % poly.length];
    const sp = cross(a, b, p), sq = cross(a, b, q);
    if (sp >= 0) left.push(p);
    if (sp <= 0) right.push(p);
    if ((sp > 0 && sq < 0) || (sp < 0 && sq > 0)) {
      const t = sp / (sp - sq);
      const x: P = [p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])];
      left.push(x);
      right.push(x);
    }
  });
  return [left, right];
}

const solid = (poly: P[]) => poly.length >= 3 && Math.abs(signedArea(poly)) > MIN_PLAN_AREA_M2;

/** Un polígono convexo menos un triángulo: las partes convexas que quedan fuera de él. */
export function subtractTriangle(poly: P[], tri: P[]): P[][] {
  const ccw = signedArea(tri) > 0 ? tri : [...tri].reverse();
  const out: P[][] = [];
  let rest = poly;
  for (let e = 0; e < 3 && solid(rest); e++) {
    const [inside, outside] = split(rest, ccw[e], ccw[(e + 1) % 3]);
    if (solid(outside)) out.push(outside);
    rest = inside;
  }
  return out;
}
