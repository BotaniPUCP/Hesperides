/**
 * Para leer en las pruebas las posiciones sin índice del modelo (x este, y arriba, z = −norte) como vértices
 * [este, norte, cota] y triángulos.
 */
export type V = [number, number, number];

export function verticesOf(p: ArrayLike<number>): V[] {
  return Array.from({ length: p.length / 3 }, (_, i) => [p[i * 3], -p[i * 3 + 2], p[i * 3 + 1]] as V);
}

export function trianglesOf(p: ArrayLike<number>): V[][] {
  const v = verticesOf(p);
  return Array.from({ length: v.length / 3 }, (_, i) => v.slice(i * 3, i * 3 + 3));
}

export function normalOf([a, b, c]: V[]): V {
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  return [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
}

export const areaOf = (t: V[]) => Math.hypot(...normalOf(t)) / 2;
export const sumArea = (ts: V[][]) => ts.reduce((s, t) => s + areaOf(t), 0);
/** Qué tanto mira la cara hacia el eje (0 este, 1 norte, 2 arriba): 1 si es perpendicular a él. */
export const facing = (t: V[], axis: 0 | 1 | 2) => Math.abs(normalOf(t)[axis]) / Math.hypot(...normalOf(t));
/** Las caras perpendiculares al eje: huellas y losas (2), contrahuellas (1 o 0, según hacia dónde suba). */
export const along = (ts: V[][], axis: 0 | 1 | 2) => ts.filter((t) => facing(t, axis) > 0.999);
export const centroidOf = (t: V[]): V => [0, 1, 2].map((k) => (t[0][k] + t[1][k] + t[2][k]) / 3) as V;
