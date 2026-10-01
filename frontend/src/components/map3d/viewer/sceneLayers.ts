import * as THREE from 'three';
import { categoryOf, colorOf, type ModeId } from '../modes';
import type { SceneData } from '../sceneData';
import type { PolyLayerId } from '../target';
import { ringLines } from './geometry';
import type { ScenePalette } from './palette';
import { createPolyLayer, WORLD_LIFT, type PolyLayer } from './polyLayer';
import type { SceneTextures } from './textures';

/** Lo que las capas leen al pintarse: cambia con el modo, la leyenda y el tema. */
export interface PaintState {
  mode: ModeId;
  hidden: Set<string>;
  palette: ScenePalette;
}

/** Altura de un edificio sin dato en OpenStreetMap (la que usaba el prototipo). */
const DEFAULT_HEIGHT_M = 8;
const CONTEXT_BASE_M = -1.6;
const SUPERVISION_COLORS: Record<string, string> = { 'ZS-1': '#4F8FEA', 'ZS-2': '#E66A8A', 'ZS-3': '#55B88A', 'ZS-4': '#D49A45' };

export type PolyLayers = Record<PolyLayerId, PolyLayer>;

function buildingEdges(shapes: SceneData['campusBuildings'], heightOf: (i: number) => number): THREE.BufferGeometry {
  const v: number[] = [];
  shapes.forEach((b, i) => {
    const top = heightOf(i);
    for (const polygon of b.g) for (const r of polygon) {
      const m = r.length / 2;
      for (let k = 0; k < m; k++) {
        const k2 = (k + 1) % m, kp = (k - 1 + m) % m;
        const x = r[2 * k], z = -r[2 * k + 1], x2 = r[2 * k2], z2 = -r[2 * k2 + 1];
        v.push(x, top, z, x2, top, z2);
        // Aristas verticales solo en esquinas marcadas: si no, las curvas se llenan de líneas.
        const a1 = Math.atan2(z - -r[2 * kp + 1], x - r[2 * kp]), a2 = Math.atan2(z2 - z, x2 - x);
        let d = Math.abs(a1 - a2);
        if (d > Math.PI) d = 2 * Math.PI - d;
        if (d > 0.35) v.push(x, 0, z, x, top, z);
      }
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  return g;
}

function outline(scene: THREE.Scene, layer: PolyLayer, y: number, color: number, opacity = 1) {
  const lines = new THREE.LineSegments(
    ringLines(layer.shapes.map((_, i) => i), (i) => layer.shapes[i], () => y),
    new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity }),
  );
  lines.position.y = WORLD_LIFT;
  scene.add(lines);
  layer.extra.push(lines);
}

export function createSceneLayers(scene: THREE.Scene, data: SceneData, textures: SceneTextures, state: PaintState): PolyLayers {
  const make = (id: PolyLayerId, shapes: { g: SceneData['campus'] }[], opts: Parameters<typeof createPolyLayer>[3]) =>
    createPolyLayer(scene, id, shapes.map((s) => s.g), opts, textures);
  const greenColor = (i: number) => {
    const p = data.greenAreas[i].props;
    // Una categoría apagada desde la leyenda se pinta atenuada, no desaparece.
    return state.hidden.has(categoryOf(p, state.mode)) ? state.palette.dimmed : colorOf(p, state.mode);
  };
  const bHeight = (i: number) => data.campusBuildings[i].props.heightM ?? DEFAULT_HEIGHT_M;
  const cHeight = (i: number) => data.contextBuildings[i].props.heightM ?? DEFAULT_HEIGHT_M;

  const layers: PolyLayers = {
    supervision: make('supervision', data.supervision, { surface: 'plain', height: () => 0.16, base: () => -0.02, opacity: 0.24, order: 1,
      color: (i) => SUPERVISION_COLORS[data.supervision[i].props.code] ?? '#8090A0' }),
    greenAreas: make('greenAreas', data.greenAreas, { surface: 'green', height: () => 0.45, base: () => 0.03, color: greenColor }),
    reserve: make('reserve', data.reserve, { surface: 'plain', height: () => 0.75, base: () => 0.05, opacity: 0.45, order: 2, color: () => '#C060FF' }),
    xerophytic: make('xerophytic', data.xerophytic, { surface: 'green', height: () => 0.6, base: () => 0.04, color: () => '#FF9030' }),
    parking: make('parking', data.parking, { surface: 'parking', height: () => 0.12, base: () => 0.01, color: () => state.palette.parking }),
    sidewalks: make('sidewalks', data.sidewalks, { surface: 'plain', height: () => 0.5, base: () => 0.06, opacity: 0.7, order: 3, color: () => '#FF4060' }),
    campusBuildings: make('campusBuildings', data.campusBuildings, { surface: 'building', height: bHeight, base: () => 0, castShadow: true,
      color: () => state.palette.building }),
    contextBuildings: make('contextBuildings', data.contextBuildings, { surface: 'plain', height: cHeight, base: () => CONTEXT_BASE_M,
      opacity: 0.6, color: () => state.palette.context }),
  };
  (layers.contextBuildings.mesh.material as THREE.Material).depthWrite = true;
  outline(scene, layers.supervision, 0.18, 0x6a7390, 0.75);
  outline(scene, layers.reserve, 0.8, 0xc060ff);
  const edges = new THREE.LineSegments(buildingEdges(data.campusBuildings, bHeight),
    new THREE.LineBasicMaterial({ color: state.palette.buildingEdge, transparent: true, opacity: 0.45 }));
  edges.position.y = WORLD_LIFT;
  scene.add(edges);
  layers.campusBuildings.extra.push(edges);
  return layers;
}
