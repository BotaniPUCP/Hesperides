import type { Polygon } from '../sceneData';
import { insideRing } from '../viewer/picking';
import type { ZoneRows } from './lookTable';
import { SIDES, type Side, type ZoneSelector } from './types';

/**
 * A qué fila de la tabla va cada vértice de un edificio con ficha, y sus
 * coordenadas sobre la cara (distancia a lo largo del muro, cota). Funciones
 * puras sobre posiciones sin índice en el marco de la escena.
 */

export interface FaceAttributes {
  /** Fila de la tabla por vértice; −1 = sin ficha. */
  row: Float32Array;
  /** (u, v) por vértice: metros a lo largo del muro y cota. */
  face: Float32Array;
}

/** Una cara es horizontal (techo) si su normal está a menos de ~45° de la vertical. */
const HORIZONTAL_NY = 0.7;
/** Lo que se aleja del muro para ver a qué lado queda la huella. */
const PROBE_M = 0.4;
const SECTOR = (2 * Math.PI) / SIDES.length;

/** El sector de una normal horizontal dada por sus componentes este y norte. */
export function sideOf(east: number, north: number): Side {
  const azimuth = Math.atan2(east, north);
  return SIDES[(Math.round(azimuth / SECTOR) + SIDES.length) % SIDES.length];
}

function insideFootprint(footprint: Polygon[], x: number, north: number): boolean {
  return footprint.some((poly) => insideRing(x, north, poly[0]) && !poly.slice(1).some((hole) => insideRing(x, north, hole)));
}

interface Box { x0: number; x1: number; n0: number; n1: number }

function boxOf(p: Float32Array, from: number, to: number): Box {
  const b = { x0: Infinity, x1: -Infinity, n0: Infinity, n1: -Infinity };
  for (let v = from; v < to; v++) {
    const x = p[v * 3], north = -p[v * 3 + 2];
    b.x0 = Math.min(b.x0, x); b.x1 = Math.max(b.x1, x);
    b.n0 = Math.min(b.n0, north); b.n1 = Math.max(b.n1, north);
  }
  return b;
}

const within = (range: [number, number] | undefined, value: number) => !range || (value >= range[0] && value <= range[1]);

function selects(where: ZoneSelector, box: Box, x: number, north: number, y: number): boolean {
  const fe = (x - box.x0) / (box.x1 - box.x0 || 1), fn = (north - box.n0) / (box.n1 - box.n0 || 1);
  return within(where.east, fe) && within(where.north, fn) && within(where.heightM, y);
}

/** La última zona con selector que contiene el punto gana; si ninguna, la primera. */
function zoneAt(zones: ZoneRows[], box: Box, x: number, north: number, y: number): ZoneRows {
  for (let i = zones.length - 1; i > 0; i--) if (selects(zones[i].where!, box, x, north, y)) return zones[i];
  return zones[0];
}

/** La normal horizontal hacia afuera: si del lado de la normal hay huella y del otro no, estaba invertida. */
function outward(footprint: Polygon[], cx: number, cn: number, east: number, north: number): [number, number] {
  const ahead = insideFootprint(footprint, cx + east * PROBE_M, cn + north * PROBE_M);
  const behind = insideFootprint(footprint, cx - east * PROBE_M, cn - north * PROBE_M);
  return ahead && !behind ? [-east, -north] : [east, north];
}

/** La u se mide desde el centro de la caja del edificio: así un tramo que no se repite se ubica en la ficha. */
function writeTriangle(p: Float32Array, t: number, row: number, tangent: [number, number] | null, box: Box, out: FaceAttributes) {
  const cx = (box.x0 + box.x1) / 2, cn = (box.n0 + box.n1) / 2;
  for (let v = t; v < t + 3; v++) {
    out.row[v] = row;
    out.face[v * 2] = tangent ? (p[v * 3] - cx) * tangent[0] + (-p[v * 3 + 2] - cn) * tangent[1] : p[v * 3];
    out.face[v * 2 + 1] = p[v * 3 + 1];
  }
}

/** Clasifica los vértices `from`–`to` (un edificio, en triángulos completos) y escribe sus atributos. */
export function classifyBuilding(p: Float32Array, from: number, to: number, footprint: Polygon[], zones: ZoneRows[], out: FaceAttributes): void {
  if (to <= from) return;
  const box = boxOf(p, from, to);
  for (let t = from; t + 2 < to; t += 3) {
    const ax = p[t * 3], ay = p[t * 3 + 1], az = p[t * 3 + 2];
    const ux = p[t * 3 + 3] - ax, uy = p[t * 3 + 4] - ay, uz = p[t * 3 + 5] - az;
    const vx = p[t * 3 + 6] - ax, vy = p[t * 3 + 7] - ay, vz = p[t * 3 + 8] - az;
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz) || 1;
    const cx = (ax + p[t * 3 + 3] + p[t * 3 + 6]) / 3, cy = (ay + p[t * 3 + 4] + p[t * 3 + 7]) / 3;
    const cn = -(az + p[t * 3 + 5] + p[t * 3 + 8]) / 3;
    const zone = zoneAt(zones, box, cx, cn, cy);
    if (Math.abs(ny / len) > HORIZONTAL_NY) {
      writeTriangle(p, t, zone.roof, null, box, out);
      continue;
    }
    const h = Math.hypot(nx, nz) || 1;
    const [east, north] = outward(footprint, cx, cn, nx / h, -nz / h);
    // tangente horizontal del muro, en (este, norte), hacia la derecha de quien lo mira desde afuera: la u sigue al
    // muro sin saltos entre sus triángulos, y la foto no queda en espejo
    writeTriangle(p, t, zone.sides[sideOf(east, north)], [-north, east], box, out);
  }
}
