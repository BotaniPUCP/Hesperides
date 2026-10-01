import * as THREE from 'three';
import type { Polygon } from '../sceneData';
import type { PolyLayerId } from '../target';
import { centroid, merged, type Meta } from './geometry';
import type { SceneTextures } from './textures';

/** Altura a la que flota la maqueta sobre el plano de la escena (la del prototipo). */
export const WORLD_LIFT = 22;

export type Surface = 'building' | 'green' | 'parking' | 'plain';

export interface PolyLayerOptions {
  surface: Surface;
  height: (i: number) => number;
  base: (i: number) => number;
  color: (i: number) => string;
  opacity?: number;
  order?: number;
  castShadow?: boolean;
}

export interface PolyLayer {
  id: PolyLayerId;
  kind: 'poly';
  count: number;
  shapes: Polygon[][];
  mesh: THREE.Mesh;
  extra: THREE.Object3D[];
  starts: number[];
  tone: Float32Array;
  warm: Float32Array;
  /** Tono cálido de los bordes del césped; nulo cuando un modo de color lo apaga. */
  warmColor: string | null;
  options: PolyLayerOptions;
  meta: Meta[];
}

function material(surface: Surface, textures: SceneTextures, opacity: number | undefined): THREE.Material {
  const common = { vertexColors: true, transparent: !!opacity, opacity: opacity ?? 1, depthWrite: !opacity };
  switch (surface) {
    case 'building':
      return new THREE.MeshPhysicalMaterial({
        ...common, roughness: 0.18, metalness: 0.08, clearcoat: 0.9, clearcoatRoughness: 0.12, reflectivity: 0.7,
        sheen: 0.3, sheenColor: new THREE.Color(0xffffff), map: textures.building, normalMap: textures.buildingNormal,
        normalScale: new THREE.Vector2(0.7, 0.7), envMapIntensity: 0.35,
      });
    case 'green':
      return new THREE.MeshPhysicalMaterial({
        ...common, roughness: 0.55, metalness: 0, clearcoat: 0.2, clearcoatRoughness: 0.5, sheen: 0.25,
        sheenRoughness: 0.5, sheenColor: new THREE.Color(0x80ff80), map: textures.green, normalMap: textures.greenNormal,
        normalScale: new THREE.Vector2(0.8, 0.8), envMapIntensity: 0.05,
      });
    case 'parking':
      return new THREE.MeshStandardMaterial({ ...common, roughness: 0.4, metalness: 0.05, map: textures.parking });
    case 'plain':
      return new THREE.MeshStandardMaterial({ ...common, roughness: 0.4, metalness: 0.05 });
  }
}

export function createPolyLayer(
  scene: THREE.Scene,
  id: PolyLayerId,
  shapes: Polygon[][],
  options: PolyLayerOptions,
  textures: SceneTextures,
): PolyLayer {
  const indices = shapes.map((_, i) => i);
  const { geo, starts, tone, warm } = merged(indices, (i) => shapes[i], options.height, options.base);
  const mesh = new THREE.Mesh(geo, material(options.surface, textures, options.opacity));
  mesh.position.y = WORLD_LIFT;
  mesh.receiveShadow = true;
  mesh.castShadow = !!options.castShadow;
  mesh.renderOrder = options.order ?? 0;
  scene.add(mesh);
  const layer: PolyLayer = {
    id, kind: 'poly', count: shapes.length, shapes, mesh, extra: [], starts, tone, warm,
    warmColor: options.surface === 'green' ? '#C8A020' : null,
    options, meta: shapes.map((g) => centroid(g)),
  };
  mesh.userData.layer = layer;
  return layer;
}

const tmp = new THREE.Color();
const warmTmp = new THREE.Color();

/** Pinta un elemento (o todos) con el tono por vértice y el borde cálido del césped. */
export function paintPoly(layer: PolyLayer, colorOf: (i: number) => string, only?: number) {
  const colors = (layer.mesh.geometry as THREE.BufferGeometry).attributes.color.array as Float32Array;
  const paintOne = (i: number) => {
    const c = tmp.set(colorOf(i));
    if (layer.warmColor) warmTmp.set(layer.warmColor);
    for (let v = layer.starts[i]; v < layer.starts[i + 1]; v++) {
      const t = layer.tone[v], w = layer.warmColor ? layer.warm[v] : 0;
      let r = c.r * t, g = c.g * t, b = c.b * t;
      if (w > 0) {
        r = r * (1 - w) + warmTmp.r * t * w;
        g = g * (1 - w) + warmTmp.g * t * w;
        b = b * (1 - w) + warmTmp.b * t * w;
      }
      colors[v * 3] = Math.min(r, 1);
      colors[v * 3 + 1] = Math.min(g, 1);
      colors[v * 3 + 2] = Math.min(b, 1);
    }
  };
  if (only === undefined) for (let i = 0; i < layer.count; i++) paintOne(i);
  else paintOne(only);
  (layer.mesh.geometry as THREE.BufferGeometry).attributes.color.needsUpdate = true;
}
