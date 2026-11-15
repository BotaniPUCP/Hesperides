import * as THREE from 'three';
import type { Polygon } from '../sceneData';

/**
 * Céspedes sobre el piso del modelo. En los desniveles el suelo del mapa se abre (D-09) y se ve el piso del SKP,
 * que a veces cubre un área verde de la base: el césped se dibuja encima de ese piso, con su forma, siguiendo su
 * pendiente. Pedido de Jean Piero del 15 nov 2026 (AV-0480 y AV-0409): ninguna parte del piso cubre un césped.
 */

/** Lo que el césped queda sobre el piso: lo justo para no parpadear con él. */
export const LAWN_LIFT_M = 0.03;
/** Por debajo de este área en planta, un triángulo es un muro (o nada) y no lleva césped. */
const MIN_PLAN_AREA_M2 = 1e-6;

type P = [number, number];
type Box = [number, number, number, number];

const cross = (a: P, b: P, c: P) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);

function boxOf(points: P[]): Box {
  const xs = points.map((p) => p[0]), ys = points.map((p) => p[1]);
  return [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
}

const overlaps = (a: Box, b: Box) => a[0] < b[1] && b[0] < a[1] && a[2] < b[3] && b[2] < a[3];

/** Un anillo plano (x0, y0, x1, y1…) sin el punto que repite el primero al cerrarse. */
function ringPoints(ring: number[]): P[] {
  const points: P[] = [];
  for (let i = 0; i < ring.length; i += 2) points.push([ring[i], ring[i + 1]]);
  const [first, last] = [points[0], points[points.length - 1]];
  if (points.length > 1 && first[0] === last[0] && first[1] === last[1]) points.pop();
  return points;
}

/** Los triángulos de un césped con sus huecos: así cada recorte es entre dos figuras convexas. */
function lawnTriangles(g: Polygon[]): P[][] {
  return g.flatMap((polygon) => {
    const [outer, ...holes] = polygon.map(ringPoints);
    const vec = (ps: P[]) => ps.map(([x, y]) => new THREE.Vector2(x, y));
    const all = [outer, ...holes].flat();
    return THREE.ShapeUtils.triangulateShape(vec(outer), holes.map(vec)).map((t) => t.map((k) => all[k]));
  });
}

/** Sutherland-Hodgman: la parte de un polígono convexo dentro de un triángulo (en cualquier sentido de giro). */
function clipToTriangle(subject: P[], tri: P[]): P[] {
  const sign = Math.sign(cross(tri[0], tri[1], tri[2]));
  let out = subject;
  for (let e = 0; e < 3 && out.length; e++) {
    const a = tri[e], b = tri[(e + 1) % 3];
    const inside = (p: P) => sign * cross(a, b, p) >= 0;
    const input = out;
    out = [];
    input.forEach((p, i) => {
      const q = input[(i + 1) % input.length];
      if (inside(p)) out.push(p);
      if (inside(p) !== inside(q)) {
        const t = cross(a, b, p) / (cross(a, b, p) - cross(a, b, q));
        out.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]);
      }
    });
  }
  return out;
}

/** La cota del plano de un triángulo del piso en un punto de su planta. */
function heightOn(tri: P[], ys: number[], p: P): number {
  const d = cross(tri[0], tri[1], tri[2]);
  const w0 = cross(tri[1], tri[2], p) / d, w1 = cross(tri[2], tri[0], p) / d;
  return w0 * ys[0] + w1 * ys[1] + (1 - w0 - w1) * ys[2];
}

const area = (ps: P[]) => Math.abs(ps.reduce((s, p, i) => s + cross([0, 0], p, ps[(i + 1) % ps.length]), 0)) / 2;

/**
 * El césped sobre el piso: triángulos en el marco del piso (el del modelo, y arriba, z al sur). Los céspedes vienen
 * en el plano de la escena y el modelo se ubica corrido `offset` en ella.
 */
export function lawnOverFloor(floor: Float32Array, lawns: Polygon[][], offset: { x: number; z: number }): Float32Array {
  const pieces = lawns.flatMap(lawnTriangles).map((t) => ({ t, box: boxOf(t) }));
  const out: number[] = [];
  const emit = ([e, n]: P, y: number) => out.push(e - offset.x, y + LAWN_LIFT_M, -n - offset.z);
  for (let i = 0; i < floor.length; i += 9) {
    const tri: P[] = [0, 3, 6].map((k) => [floor[i + k] + offset.x, -(floor[i + k + 2] + offset.z)]);
    if (area(tri) < MIN_PLAN_AREA_M2) continue;
    const ys = [floor[i + 1], floor[i + 4], floor[i + 7]];
    const box = boxOf(tri);
    for (const piece of pieces) {
      if (!overlaps(box, piece.box)) continue;
      const clipped = clipToTriangle(piece.t, tri);
      if (clipped.length < 3 || area(clipped) < MIN_PLAN_AREA_M2) continue;
      for (let k = 1; k + 1 < clipped.length; k++) {
        [clipped[0], clipped[k], clipped[k + 1]].forEach((p) => emit(p, heightOn(tri, ys, p)));
      }
    }
  }
  return new Float32Array(out);
}

const polygonsBox = (g: Polygon[]) => boxOf(g.flatMap((polygon) => ringPoints(polygon[0])));

/** Los céspedes que tocan un desnivel: fuera de ellos el suelo del mapa ya los dibuja. */
export function lawnsOverSunken(lawns: Polygon[][], sunken: Polygon[][]): Polygon[][] {
  const boxes = sunken.map(polygonsBox);
  return lawns.filter((g) => {
    const box = polygonsBox(g);
    return boxes.some((b) => overlaps(box, b));
  });
}
