import * as THREE from 'three';
import type { Polygon } from '../sceneData';
import type { PolyLayer } from '../viewer/polyLayer';
import { classifyBuilding, type FaceAttributes } from './classifyFaces';
import { createLookMaterial } from './lookMaterial';
import { buildLookTable } from './lookTable';
import type { BuildingLook, PhotoAtlas } from './types';
import { validateLooks } from './validateLook';

/** El color con que `paintPoly` pinta un edificio con ficha en modo real: neutro, para que el resaltado lo tiña. */
export const NEUTRAL = '#FFFFFF';
const MATERIAL_TODAY = 0;
const MATERIAL_REAL = 1;

export interface RealColors {
  /** Si el edificio `i` de la capa tiene ficha. */
  hasLook: (i: number) => boolean;
  enabled: () => boolean;
  /** Cambia el material; no toca la geometría ni vuelve a clasificar. */
  setEnabled: (on: boolean) => void;
}

export interface LookedBuilding {
  planKey: string | null;
  g: Polygon[];
}

/** En modo real las aristas rosadas desentonan: pasan a un gris tenue, como juntas. */
const REAL_EDGE = { color: new THREE.Color('#2b2b2b'), opacity: 0.18 };

export function setEdgesForRealColors(extra: THREE.Object3D[], on: boolean): void {
  const edges = extra.find((o): o is THREE.LineSegments => (o as THREE.LineSegments).isLineSegments);
  if (!edges) return;
  const material = edges.material as THREE.LineBasicMaterial;
  material.userData.today ??= { color: material.color.clone(), opacity: material.opacity };
  const look = on ? REAL_EDGE : material.userData.today;
  material.color.copy(look.color);
  material.opacity = look.opacity;
}

/** Tramos seguidos de edificios con o sin ficha: cada uno, un grupo con su material. */
function materialGroups(starts: number[], looked: boolean[]): { start: number; count: number; materialIndex: number }[] {
  const groups: { start: number; count: number; materialIndex: number }[] = [];
  looked.forEach((on, i) => {
    const count = starts[i + 1] - starts[i];
    if (!count) return;
    const materialIndex = on ? MATERIAL_REAL : MATERIAL_TODAY;
    const last = groups[groups.length - 1];
    if (last && last.materialIndex === materialIndex && last.start + last.count === starts[i]) last.count += count;
    else groups.push({ start: starts[i], count, materialIndex });
  });
  return groups;
}

export interface PhotoSource {
  atlas: PhotoAtlas;
  url: string;
  /** Llega el atlas: hay que redibujar. */
  onLoad: () => void;
}

/**
 * Prepara el modo real sobre la capa de edificios (SPEC-109): valida las fichas,
 * clasifica las caras una sola vez y deja listos los dos materiales.
 */
export function createRealColors(layer: PolyLayer, buildings: LookedBuilding[], looks: BuildingLook[], photos: PhotoSource): RealColors {
  const planKeys = new Set(buildings.map((b) => b.planKey).filter((k): k is string => !!k));
  validateLooks(looks, planKeys, photos.atlas);
  const table = buildLookTable(looks, photos.atlas);
  const geometry = layer.mesh.geometry as THREE.BufferGeometry;
  const positions = geometry.attributes.position.array as Float32Array;
  const n = positions.length / 3;
  const out: FaceAttributes = { row: new Float32Array(n).fill(-1), face: new Float32Array(n * 2) };
  const looked = buildings.map((b, i) => {
    const zones = b.planKey ? table.zones.get(b.planKey) : undefined;
    if (zones) classifyBuilding(positions, layer.starts[i], layer.starts[i + 1], b.g, zones, out);
    return !!zones;
  });
  geometry.setAttribute('aLookRow', new THREE.BufferAttribute(out.row, 1));
  geometry.setAttribute('aLookFace', new THREE.BufferAttribute(out.face, 2));
  geometry.setAttribute('aTone', new THREE.BufferAttribute(layer.tone, 1));
  const today = layer.mesh.material as THREE.Material;
  const real = createLookMaterial(table, photos.url, photos.onLoad);
  const groups = materialGroups(layer.starts, looked);
  let on = false;
  return {
    hasLook: (i) => looked[i] ?? false,
    enabled: () => on,
    setEnabled(value) {
      on = value;
      geometry.clearGroups();
      if (on) groups.forEach((g) => geometry.addGroup(g.start, g.count, g.materialIndex));
      layer.mesh.material = on ? [today, real] : today;
    },
  };
}
