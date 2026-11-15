import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { BuildingModelManifest, BuildingNodeKind, BuildingPiece, BuildingProperties, BuildingStair } from '@shared/types';
import type { LocalPlane } from '../projection';
import { polygons, type Polygon, type ScenePoly } from '../sceneData';
import { adjusted, adjustmentsOf, lifted, liftsOf, type AdjustmentMatrix } from './adjustments';
import { floorStepsOf, withFloorSteps } from './floorSteps';
import { assemble, prismParts, type MergedGeometry } from './geometry';
import { insideRing } from './picking';
import { piecesOf, splitPiece } from './pieces';
import { stairsOf, withStair } from './stairs';

/**
 * El modelo de los edificios del plano oficial (SPEC-108 D-06): el GLB que arma
 * `scripts/mapa/plano_pucp/generar_modelo.py` y su manifiesto, llevados a la
 * escena. El GLB trae un nodo por edificio principal (con nombre `plan_key`) y
 * los de suelo, desniveles, huaca y decoración: sin índice, sin transformaciones
 * y en metros alrededor del anclaje (x este, y arriba, z = −norte).
 */

/** Lo que no es un edificio: suelo, desniveles, huaca y decoración. */
export type PlanNodeKind = Exclude<BuildingNodeKind, 'edificio'>;

export interface PlanNode {
  /** Posiciones sin índice en el marco del modelo, alrededor del anclaje. */
  positions: Float32Array;
  /** Coordenadas de textura en metros, proyectadas según la orientación de cada cara; nulas si el nodo no trae. */
  uv: Float32Array | null;
}

export interface SunkenArea {
  /** La abertura en metros del plano local. */
  g: Polygon[];
  /** Cota del piso del desnivel, negativa. */
  floorM: number;
}

export interface PlanModel {
  /** De `planKey` a posiciones sin índice en el marco de la escena. Un principal que es todo suelo tiene una malla vacía. */
  buildings: Map<string, Float32Array>;
  /** De `planKey` al primer vértice de su escalera (SPEC-108 D-17): de ahí al final de su malla, nada es fachada. */
  stairFrom: Map<string, number>;
  /** Un nodo por tipo: los del mismo tipo (los muros y el fondo de los desniveles) van juntos. */
  nodes: Partial<Record<PlanNodeKind, PlanNode>>;
  sunken: SunkenArea[];
  /** El anclaje del modelo en la escena: ahí se ubican las mallas de los nodos. */
  offset: { x: number; z: number };
  /** La etiqueta de la huaca y su punto en la escena; `y` es la altura sobre el suelo. */
  huaca: { label: string; x: number; y: number; z: number };
}

/** Lee el GLB con su manifiesto. Lanza si el archivo no es un GLB válido: quien llama cae a los prismas. */
export async function parsePlanModel(manifest: BuildingModelManifest, glb: ArrayBuffer, plane: LocalPlane): Promise<PlanModel> {
  const fixes = { adjustments: adjustmentsOf(manifest), lifts: liftsOf(manifest), stairs: stairsOf(manifest), pieces: piecesOf(manifest) };
  const floorSteps = floorStepsOf(manifest);
  const { scene } = await new GLTFLoader().parseAsync(glb, '');
  const anchor = plane.toPlane(manifest.anchor.lat, manifest.anchor.lon);
  const offset = { x: anchor.x, z: -anchor.y };
  const buildings = new Map<string, Float32Array>();
  const stairFrom = new Map<string, number>();
  const parts: Partial<Record<PlanNodeKind, PlanNode[]>> = {};
  scene.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    // GLTFLoader limpia el nombre del nodo («unified:lugar-prestado» pierde los dos puntos); el original queda en userData.
    const key = (mesh.userData.name as string | undefined) ?? mesh.name;
    const kind = manifest.nodes[key];
    if (!kind) return;
    const geo = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry;
    const positions = geo.attributes.position.array as Float32Array;
    if (kind !== 'edificio') {
      (parts[kind] ??= []).push({ positions, uv: (geo.attributes.uv?.array as Float32Array | undefined) ?? null });
      return;
    }
    const fixed = fixedMesh(key, positions, fixes);
    buildings.set(key, shifted(fixed.positions, offset));
    if (fixed.stairFrom !== undefined) stairFrom.set(key, fixed.stairFrom);
    fixed.pieces.forEach((piece, pieceKey) => buildings.set(pieceKey, shifted(piece, offset)));
  });
  for (const key of fixes.pieces.keys()) if (!buildings.has(key)) throw new Error(`La pieza ${key} sale de una malla que no está en el modelo`);
  // Sus piezas pasaron todas a ser suelo: ni malla ni prisma, pero su tramo sigue en la capa (D-08).
  manifest.groundOnly.forEach((key) => buildings.set(key, new Float32Array(0)));
  const [lat, lon, zM] = manifest.huaca.at;
  const huaca = plane.toPlane(lat, lon);
  return {
    buildings,
    stairFrom,
    nodes: Object.fromEntries(Object.entries(parts).map(([kind, list]) => [kind, kind === 'suelo' ? withFloorSteps(joined(list), floorSteps) : joined(list)])),
    sunken: manifest.sunken.map((s) => ({ g: polygons(s.polygon, plane), floorM: s.floorM })),
    offset,
    huaca: { label: manifest.huaca.label, x: huaca.x, y: zM, z: -huaca.y },
  };
}

interface Fixes {
  adjustments: Map<string, AdjustmentMatrix>;
  lifts: Map<string, number>;
  stairs: Map<string, BuildingStair>;
  pieces: Map<string, BuildingPiece>;
}

/**
 * La malla de un edificio con lo que el manifiesto le corrige, sin tocar el GLB: primero su ajuste en planta y en altura (D-16),
 * luego le salen las piezas que son otros edificios (D-18) y, sobre lo que queda, va su escalera (D-17).
 */
function fixedMesh(key: string, raw: Float32Array, fixes: Fixes): { positions: Float32Array; stairFrom?: number; pieces: Map<string, Float32Array> } {
  const adjustment = fixes.adjustments.get(key);
  const lift = fixes.lifts.get(key);
  let positions = adjustment ? adjusted(raw, adjustment) : raw;
  if (lift !== undefined) positions = lifted(positions, lift);
  const pieces = new Map<string, Float32Array>();
  for (const [pieceKey, piece] of fixes.pieces) {
    if (piece.from !== key) continue;
    const split = splitPiece(positions, piece.polygon, pieceKey);
    positions = split.kept;
    pieces.set(pieceKey, split.piece);
  }
  const stair = fixes.stairs.get(key);
  return { ...(stair ? withStair(positions, stair, key) : { positions }), pieces };
}

function shifted(p: Float32Array, offset: PlanModel['offset']): Float32Array {
  const out = new Float32Array(p.length);
  for (let i = 0; i < p.length; i += 3) {
    out[i] = p[i] + offset.x;
    out[i + 1] = p[i + 1];
    out[i + 2] = p[i + 2] + offset.z;
  }
  return out;
}

function concat(arrays: Float32Array[]): Float32Array {
  const out = new Float32Array(arrays.reduce((n, a) => n + a.length, 0));
  let at = 0;
  arrays.forEach((a) => { out.set(a, at); at += a.length; });
  return out;
}

function joined(list: PlanNode[]): PlanNode {
  if (list.length === 1) return list[0];
  const uv = list.some((n) => n.uv) ? concat(list.map((n) => n.uv ?? new Float32Array((n.positions.length / 3) * 2))) : null;
  return { positions: concat(list.map((n) => n.positions)), uv };
}

/** Una malla sin índice con la normal de cada cara: con vértices compartidos la luz se suavizaría en las esquinas (D-11). */
export function facetedGeometry(positions: Float32Array, uv: Float32Array | null = null): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  if (uv) geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  return geo;
}

/**
 * Los edificios principales en una sola geometría: cada uno con su malla del
 * modelo si la tiene y, si no (sin `planKey`, solo del mapa, o sin modelo), con
 * su prisma de hoy. Un tramo por edificio, en el orden de `feats`, para que el
 * clic, el resaltado y el repintado sigan funcionando por índice.
 */
export function mergedBuildings(
  feats: ScenePoly<BuildingProperties>[],
  model: PlanModel | null,
  heightOf: (i: number) => number,
  baseOf: (i: number) => number,
): MergedGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const starts: number[] = [];
  let n = 0;
  feats.forEach((f, i) => {
    starts.push(n);
    const mesh = f.props.planKey ? model?.buildings.get(f.props.planKey) : undefined;
    const geos = mesh ? (mesh.length ? [facetedGeometry(mesh)] : []) : prismParts(f.g, heightOf(i), baseOf(i));
    for (const geo of geos) {
      parts.push(geo);
      n += geo.attributes.position.count;
    }
  });
  starts.push(n);
  return assemble(parts, starts, n);
}

/** La cota del piso del desnivel que contiene el punto (metros del plano) o 0 si no cae en ninguno. */
export function sunkenFloorAt(sunken: SunkenArea[], x: number, y: number): number {
  const area = sunken.find((s) => s.g.some((poly) => insideRing(x, y, poly[0]) && !poly.slice(1).some((hole) => insideRing(x, y, hole))));
  return area?.floorM ?? 0;
}
