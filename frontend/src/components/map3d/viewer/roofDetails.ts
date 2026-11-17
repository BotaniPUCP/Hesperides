import * as THREE from 'three';
import type { Polygon } from '../sceneData';
import { seeded } from './sunsetTrees';

/**
 * Lo que hay sobre los techos planos del campus en el modo Atardecer: equipos de
 * aire, cajas de ascensor y tanques de agua, instanciados. La cota sale de la malla
 * de cada edificio; un techo inclinado (pocos vértices arriba) no lleva nada.
 */

export const ROOFS = {
  /** Un equipo cada tantos m² de techo, entre un mínimo y un máximo por edificio. */
  m2PerItem: 140,
  min: 1,
  max: 14,
  /** Un techo es plano si al menos tantos vértices quedan a esta distancia de la cota más alta. */
  flatVertices: 6,
  flatToleranceM: 0.35,
  /** Margen al borde de la huella. */
  edgeM: 1.5,
  box: '#8e8a84',
  tank: '#d9d6cf',
} as const;

function pointInRing(x: number, y: number, ring: number[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) {
    const xi = ring[i], yi = ring[i + 1], xj = ring[j], yj = ring[j + 1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function ringArea(ring: number[]): number {
  let a = 0;
  for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) a += ring[j] * ring[i + 1] - ring[i] * ring[j + 1];
  return Math.abs(a) / 2;
}

/** La cota del techo de un edificio (en coordenadas de su malla) si es plano; si no, null. */
export function flatRoofTop(positions: ArrayLike<number>, from: number, to: number): number | null {
  let top = -Infinity;
  for (let v = from; v < to; v++) top = Math.max(top, positions[v * 3 + 1]);
  let near = 0;
  for (let v = from; v < to; v++) if (top - positions[v * 3 + 1] < ROOFS.flatToleranceM) near++;
  return near >= ROOFS.flatVertices ? top : null;
}

interface RoofItem { x: number; y: number; z: number; w: number; h: number; d: number; yaw: number; tank: boolean }

/** Dónde va cada equipo: dentro de la huella (con margen), sobre la cota del techo. */
export function roofItems(footprints: Polygon[][], tops: (number | null)[], seed = 0x700f): RoofItem[] {
  const rnd = seeded(seed);
  const items: RoofItem[] = [];
  footprints.forEach((g, i) => {
    const top = tops[i];
    const ring = g[0]?.[0];
    if (top === null || !ring || ring.length < 6) return;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let k = 0; k < ring.length; k += 2) {
      x0 = Math.min(x0, ring[k]); x1 = Math.max(x1, ring[k]); y0 = Math.min(y0, ring[k + 1]); y1 = Math.max(y1, ring[k + 1]);
    }
    const n = THREE.MathUtils.clamp(Math.round(ringArea(ring) / ROOFS.m2PerItem), ROOFS.min, ROOFS.max);
    for (let k = 0, tries = 0; k < n && tries < n * 12; tries++) {
      const tank = rnd() < 0.18;
      const w = tank ? 1.4 + rnd() : 1.2 + rnd() * 2.6, d = tank ? w : 1 + rnd() * 2.2, h = tank ? 1.6 + rnd() * 0.8 : 0.7 + rnd() * 1.6;
      const x = x0 + rnd() * (x1 - x0), y = y0 + rnd() * (y1 - y0);
      const r = Math.max(w, d) / 2 + ROOFS.edgeM;
      if (![[0, 0], [r, 0], [-r, 0], [0, r], [0, -r]].every(([dx, dy]) => pointInRing(x + dx, y + dy, ring))) continue;
      items.push({ x, y, z: top, w, h, d, yaw: Math.round(rnd() * 4) * (Math.PI / 2), tank });
      k++;
    }
  });
  return items;
}

/** Las instancias, ocultas hasta que el modo las pida. `lift`: la altura de la capa de edificios en la escena. */
export function createRoofDetails(scene: THREE.Scene, footprints: Polygon[][], positions: ArrayLike<number>, starts: number[], lift: number): THREE.Group {
  const tops = footprints.map((_, i) => flatRoofTop(positions, starts[i], starts[i + 1]));
  const items = roofItems(footprints, tops);
  const group = new THREE.Group();
  group.visible = false;
  const boxes = items.filter((it) => !it.tank), tanks = items.filter((it) => it.tank);
  const make = (geo: THREE.BufferGeometry, color: string, list: RoofItem[]) => {
    const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.25 }), list.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    list.forEach((it, k) => {
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), it.yaw);
      m.compose(p.set(it.x, it.z + lift, -it.y), q, s.set(it.w, it.h, it.d));
      mesh.setMatrixAt(k, m);
    });
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.raycast = () => undefined;
    group.add(mesh);
  };
  make(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), ROOFS.box, boxes);
  make(new THREE.CylinderGeometry(0.5, 0.5, 1, 12).translate(0, 0.5, 0), ROOFS.tank, tanks);
  scene.add(group);
  return group;
}
