/**
 * El mapa de sombras sigue a la cámara (SPEC-112 D-21): cubre un radio que
 * crece con la distancia, en saltos, y su centro se ajusta a la retícula de
 * texeles de la luz para que las sombras no tiemblen al moverse. Funciones
 * puras sobre vectores [x, y, z] de la escena.
 */

export type Vec3 = [number, number, number];

export const SHADOW_FIT = { perDistance: 0.9, minM: 60, maxM: 720, step: 1.25 } as const;

/** El radio más chico de la serie 60 · 1,25ⁿ que cubre la vista, hasta 720 m. */
export function shadowRadius(cameraDistance: number): number {
  const want = Math.max(cameraDistance * SHADOW_FIT.perDistance, SHADOW_FIT.minM);
  const steps = Math.ceil(Math.log(want / SHADOW_FIT.minM) / Math.log(SHADOW_FIT.step) - 1e-9);
  return Math.min(SHADOW_FIT.minM * SHADOW_FIT.step ** Math.max(steps, 0), SHADOW_FIT.maxM);
}

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const add = (...vs: Vec3[]): Vec3 => vs.reduce((s, v) => [s[0] + v[0], s[1] + v[1], s[2] + v[2]], [0, 0, 0]);
const unit = (a: Vec3): Vec3 => scale(a, 1 / (Math.hypot(...a) || 1));
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/** Ejes de la imagen de la luz: derecha y arriba, perpendiculares a la dirección del sol. */
function lightAxes(sunDir: Vec3): [Vec3, Vec3, Vec3] {
  const forward = unit(scale(sunDir, -1));
  const side = cross(forward, [0, 1, 0]);
  const right = Math.hypot(...side) < 1e-6 ? [1, 0, 0] as Vec3 : unit(side);
  return [right, unit(cross(right, forward)), forward];
}

/** El punto más cercano a `focus` cuyo centro de sombra cae justo en un texel (también en profundidad, para que no se mueva). */
export function snapToTexels(focus: Vec3, sunDir: Vec3, radius: number, mapSize: number): Vec3 {
  const texel = (2 * radius) / mapSize;
  const snap = (axis: Vec3) => scale(axis, Math.round(dot(focus, axis) / texel) * texel);
  return add(...lightAxes(sunDir).map(snap));
}
