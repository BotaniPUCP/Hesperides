import * as THREE from 'three';
import type { Polygon, Ring } from '../sceneData';

/**
 * Geometría de la maqueta, portada del prototipo v39. Los anillos llegan en
 * metros con y hacia el norte; en la escena el norte es -z, por eso cada
 * extruido se rota -90° sobre x.
 */

/** Centro, radio de encuadre y área del rectángulo envolvente de un elemento. */
export interface Meta {
  x: number;
  z: number;
  r: number;
  area: number;
}

/** Radio mínimo de encuadre al enfocar un elemento pequeño. */
const MIN_FOCUS_RADIUS_M = 12;

function ringVectors(ring: Ring): THREE.Vector2[] {
  const out: THREE.Vector2[] = [];
  for (let i = 0; i < ring.length; i += 2) out.push(new THREE.Vector2(ring[i], ring[i + 1]));
  return out;
}

export function polygonShapes(g: Polygon[]): THREE.Shape[] {
  return g.map((polygon) => {
    const shape = new THREE.Shape(ringVectors(polygon[0]));
    for (let k = 1; k < polygon.length; k++) shape.holes.push(new THREE.Path(ringVectors(polygon[k])));
    return shape;
  });
}

export function centroid(g: Polygon[]): Meta {
  let sx = 0, sy = 0, n = 0, minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity;
  for (const polygon of g) {
    const ring = polygon[0];
    for (let i = 0; i < ring.length; i += 2) {
      const x = ring[i], y = ring[i + 1];
      sx += x; sy += y; n++;
      minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y); maxy = Math.max(maxy, y);
    }
  }
  return {
    x: sx / n,
    z: -sy / n,
    r: Math.max(MIN_FOCUS_RADIUS_M, Math.hypot(maxx - minx, maxy - miny) / 2),
    area: (maxx - minx) * (maxy - miny),
  };
}

export interface MergedGeometry {
  geo: THREE.BufferGeometry;
  /** Primer vértice de cada elemento: permite pintar o identificar uno solo. */
  starts: number[];
  /** Factor de luz por vértice: techos más claros, bases más oscuras. */
  tone: Float32Array;
  /** Peso del color cálido de borde por vértice. */
  warm: Float32Array;
}

/** Extruye todos los elementos de una capa en una sola geometría (una llamada de dibujo). */
export function merged<T>(feats: T[], shapeOf: (f: T) => Polygon[], heightOf: (f: T) => number, baseOf: (f: T) => number): MergedGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const starts: number[] = [];
  let n = 0;
  feats.forEach((f) => {
    starts.push(n);
    for (const shape of polygonShapes(shapeOf(f))) {
      let geo: THREE.BufferGeometry;
      try {
        geo = new THREE.ExtrudeGeometry(shape, { depth: heightOf(f), bevelEnabled: false, curveSegments: 1 });
      } catch {
        continue; // un anillo degenerado no debe tumbar la capa entera
      }
      geo.rotateX(-Math.PI / 2);
      geo.translate(0, baseOf(f), 0);
      if (geo.index) geo = geo.toNonIndexed();
      parts.push(geo);
      n += geo.attributes.position.count;
    }
  });
  starts.push(n);
  return assemble(parts, starts, n);
}

function assemble(parts: THREE.BufferGeometry[], starts: number[], n: number): MergedGeometry {
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  let o = 0;
  for (const g of parts) {
    pos.set(g.attributes.position.array as Float32Array, o * 3);
    nor.set(g.attributes.normal.array as Float32Array, o * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array as Float32Array, o * 2);
    o += g.attributes.position.count;
    g.dispose();
  }
  const { tone, warm } = shading(pos, nor, starts, n);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.computeBoundingSphere();
  return { geo, starts, tone, warm };
}

/** El sombreado tonal del prototipo: techo claro, laterales en degradado, base oscura. */
function shading(pos: Float32Array, nor: Float32Array, starts: number[], n: number) {
  const tone = new Float32Array(n), warm = new Float32Array(n);
  for (let fi = 0; fi < starts.length - 1; fi++) {
    const s0 = starts[fi], s1 = starts[fi + 1];
    if (s1 <= s0) continue;
    let yMin = Infinity, yMax = -Infinity;
    for (let v = s0; v < s1; v++) { yMin = Math.min(yMin, pos[v * 3 + 1]); yMax = Math.max(yMax, pos[v * 3 + 1]); }
    const span = yMax - yMin || 1;
    for (let v = s0; v < s1; v++) {
      const ny = nor[v * 3 + 1], yNorm = (pos[v * 3 + 1] - yMin) / span;
      if (ny > 0.5) { tone[v] = 1.12 + yNorm * 0.1; warm[v] = 0; }
      else if (ny < -0.5) { tone[v] = 0.55; warm[v] = 0.95; }
      else { tone[v] = 0.58 + yNorm * 0.28; warm[v] = Math.max(0, (1 - yNorm) * 0.9); }
    }
  }
  return { tone, warm };
}

/** Contornos de cada anillo a la altura indicada (bordes de zonas y selección). */
export function ringLines<T>(feats: T[], shapeOf: (f: T) => Polygon[], yOf: (f: T) => number): THREE.BufferGeometry {
  const v: number[] = [];
  feats.forEach((f) => {
    const y = yOf(f);
    for (const polygon of shapeOf(f)) for (const r of polygon) {
      const m = r.length / 2;
      for (let k = 0; k < m; k++) {
        const k2 = (k + 1) % m;
        v.push(r[2 * k], y, -r[2 * k + 1], r[2 * k2], y, -r[2 * k2 + 1]);
      }
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  return g;
}

/** Índice del elemento al que pertenece un vértice (búsqueda binaria sobre `starts`). */
export function elementOfVertex(starts: number[], vertex: number): number {
  let lo = 0, hi = starts.length - 2;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (starts[mid] <= vertex) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}
