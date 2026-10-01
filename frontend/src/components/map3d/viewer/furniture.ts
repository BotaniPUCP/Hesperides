import * as THREE from 'three';
import type { CampusFeatureProperties } from '@shared/types';
import type { ScenePoint } from '../sceneData';
import type { PointLayerId } from '../target';
import type { Meta } from './geometry';
import { WORLD_LIFT } from './polyLayer';

/**
 * Mobiliario como modelos instanciados (un dibujo por tipo, no uno por objeto),
 * del prototipo v39. Cada modelo tiene un cuerpo fijo y un acento que lleva el
 * color de la capa y se resalta al seleccionar.
 */

type Part = [THREE.BufferGeometry, string];
const WHITE = '#FFFFFF';
const box = (w: number, h: number, d: number, x: number, y: number, z: number) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
const cyl = (rt: number, rb: number, h: number, x: number, y: number, z: number, s = 12) =>
  new THREE.CylinderGeometry(rt, rb, h, s).translate(x, y, z);
const ico = (r: number, sx: number, sy: number, sz: number, x: number, y: number, z: number) =>
  new THREE.IcosahedronGeometry(r, 0).scale(sx, sy, sz).translate(x, y, z);

const MODELS: Record<string, { body: Part[]; accent: Part[] }> = {
  bin: {
    body: [[cyl(0.3, 0.3, 0.07, 0, 0.82, 0, 14), '#6F7A8E'], [box(0.14, 0.05, 0.05, 0, 0.88, 0), '#5E687B']],
    accent: [[cyl(0.27, 0.22, 0.78, 0, 0.39, 0, 14), WHITE]],
  },
  gate: {
    body: [[box(0.7, 3.3, 0.7, -3.2, 1.65, 0), '#ECEAE5'], [box(0.7, 3.3, 0.7, 3.2, 1.65, 0), '#ECEAE5'],
      [box(1.1, 0.2, 1.1, -3.2, 0.1, 0), '#D9D6CF'], [box(1.1, 0.2, 1.1, 3.2, 0.1, 0), '#D9D6CF']],
    accent: [[box(7.6, 0.55, 0.95, 0, 3.55, 0), WHITE]],
  },
  bird: {
    body: [[ico(0.3, 1.45, 0.9, 0.9, 0, 0.62, 0), '#5E6B7A'], [ico(0.17, 1, 1, 1, 0.4, 0.86, 0), '#5E6B7A'],
      [new THREE.ConeGeometry(0.06, 0.2, 6).rotateZ(-Math.PI / 2).translate(0.63, 0.85, 0), '#E0B25A']],
    accent: [[cyl(0.75, 0.75, 0.04, 0, 0.02, 0, 24), WHITE]],
  },
  animal: {
    body: [[box(0.9, 0.36, 0.38, 0, 0.56, 0), '#A68A6D'], [box(0.32, 0.3, 0.3, 0.56, 0.76, 0), '#A68A6D'],
      [box(0.1, 0.4, 0.1, 0.32, 0.2, 0.13), '#8E7358'], [box(0.1, 0.4, 0.1, -0.32, 0.2, -0.13), '#8E7358']],
    accent: [[cyl(0.85, 0.85, 0.04, 0, 0.02, 0, 24), WHITE]],
  },
};

function coloured(parts: Part[]): THREE.BufferGeometry {
  const geos = parts.map(([g, hex]) => {
    const geo = g.index ? g.toNonIndexed() : g;
    const c = new THREE.Color(hex), n = geo.attributes.position.count, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return geo;
  });
  const n = geos.reduce((s, g) => s + g.attributes.position.count, 0);
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3);
  let o = 0;
  for (const g of geos) {
    pos.set(g.attributes.position.array as Float32Array, o * 3);
    nor.set(g.attributes.normal.array as Float32Array, o * 3);
    col.set(g.attributes.color.array as Float32Array, o * 3);
    o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return out;
}

export interface PointLayer {
  id: PointLayerId;
  kind: 'inst';
  count: number;
  meshes: THREE.InstancedMesh[];
  /** Malla de acento e índice de instancia de cada elemento: lo que se pinta. */
  slots: { mesh: THREE.InstancedMesh; k: number }[];
  items: { meshes: THREE.InstancedMesh[]; k: number; x: number; z: number; rot: number }[];
  scaleRange: [number, number];
  color: (i: number) => string;
  meta: Meta[];
}

export function createPointLayer(
  scene: THREE.Scene,
  id: PointLayerId,
  points: ScenePoint<CampusFeatureProperties>[],
  opts: { model: (i: number) => keyof typeof MODELS; rotation?: (i: number) => number; scaleRange: [number, number]; color: string },
): PointLayer {
  const layer: PointLayer = {
    id, kind: 'inst', count: points.length, meshes: [], slots: [], items: [], scaleRange: opts.scaleRange,
    color: () => opts.color, meta: points.map((p) => ({ x: p.p[0], z: -p.p[1], r: 25, area: 0 })),
  };
  const groups = new Map<string, number[]>();
  points.forEach((_, i) => groups.set(opts.model(i), [...(groups.get(opts.model(i)) ?? []), i]));
  for (const [model, idx] of groups) {
    const make = (geo: THREE.BufferGeometry) => {
      const m = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }), idx.length);
      m.position.y = WORLD_LIFT;
      m.castShadow = m.receiveShadow = true;
      m.userData = { layer, map: idx };
      layer.meshes.push(m);
      scene.add(m);
      return m;
    };
    const body = make(coloured(MODELS[model].body)), accent = make(coloured(MODELS[model].accent));
    idx.forEach((i, k) => {
      layer.slots[i] = { mesh: accent, k };
      layer.items.push({ meshes: [body, accent], k, x: points[i].p[0], z: -points[i].p[1], rot: opts.rotation?.(i) ?? 0 });
      body.setColorAt(k, new THREE.Color(WHITE));
    });
    if (body.instanceColor) body.instanceColor.needsUpdate = true;
  }
  return layer;
}

const dummy = new THREE.Object3D();

/** Escala los modelos con la distancia de la cámara, dentro del rango de cada capa. */
export function scaleFurniture(layers: PointLayer[], cameraDistance: number) {
  for (const layer of layers) {
    const e = THREE.MathUtils.clamp(cameraDistance / 150, layer.scaleRange[0], layer.scaleRange[1]);
    for (const it of layer.items) {
      dummy.position.set(it.x, 0, it.z);
      dummy.rotation.set(0, it.rot, 0);
      dummy.scale.set(e, e, e);
      dummy.updateMatrix();
      for (const m of it.meshes) m.setMatrixAt(it.k, dummy.matrix);
    }
    for (const m of layer.meshes) m.instanceMatrix.needsUpdate = true;
  }
}

const tmp = new THREE.Color();

export function paintPoints(layer: PointLayer, colorOf: (i: number) => string, only?: number) {
  const one = (i: number) => {
    const slot = layer.slots[i];
    if (!slot) return;
    slot.mesh.setColorAt(slot.k, tmp.set(colorOf(i)));
    if (slot.mesh.instanceColor) slot.mesh.instanceColor.needsUpdate = true;
  };
  if (only === undefined) for (let i = 0; i < layer.count; i++) one(i);
  else one(only);
}
