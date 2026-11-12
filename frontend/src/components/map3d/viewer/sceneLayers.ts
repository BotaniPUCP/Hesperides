import * as THREE from 'three';
import { categoryOf, colorOf, MODES, type ModeId } from '../modes';
import type { SceneData } from '../sceneData';
import type { PolyLayerId } from '../target';
import { ringLines } from './geometry';
import type { ScenePalette } from './palette';
import { facetedGeometry, mergedBuildings, type PlanModel, type PlanNode, type PlanNodeKind } from './planModel';
import { createPolyLayer, surfaceMaterial, WORLD_LIFT, type PolyLayer } from './polyLayer';
import { openOverSunken, type Stage } from './stage';
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

/** Las capas del suelo que se abren sobre los desniveles, como la cara de arriba del zócalo (D-09). */
const GROUND_LAYERS = ['greenAreas', 'xerophytic', 'parking', 'sidewalks', 'reserve', 'supervision'] as const;
/** Aristas de los modelos: donde las caras se quiebran más de esto, como en la página de comparación aprobada. */
const MODEL_EDGE_ANGLE_DEG = 30;

export type PolyLayers = Record<PolyLayerId, PolyLayer>;

function meshEdges(positions: Float32Array, out: number[]) {
  const source = new THREE.BufferGeometry();
  source.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const edges = new THREE.EdgesGeometry(source, MODEL_EDGE_ANGLE_DEG);
  for (const x of edges.attributes.position.array as Float32Array) out.push(x);
  edges.dispose();
}

/** Bordes de los prismas (contorno arriba y aristas en las esquinas marcadas) y de las mallas del modelo. */
function buildingEdges(shapes: SceneData['campusBuildings'], heightOf: (i: number) => number, model: PlanModel | null): THREE.BufferGeometry {
  const v: number[] = [];
  shapes.forEach((b, i) => {
    const mesh = b.props.planKey ? model?.buildings.get(b.props.planKey) : undefined;
    if (mesh) {
      meshEdges(mesh, v);
      return;
    }
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

/** Con modelo, los edificios principales con nodo se dibujan con su malla y el suelo se abre en los desniveles. */
export function createSceneLayers(scene: THREE.Scene, data: SceneData, textures: SceneTextures, state: PaintState, model: PlanModel | null = null): PolyLayers {
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
    campusBuildings: createPolyLayer(scene, 'campusBuildings', data.campusBuildings.map((s) => s.g), { surface: 'building', height: bHeight,
      base: () => 0, castShadow: true, doubleSided: !!model, color: () => state.palette.building }, textures,
    mergedBuildings(data.campusBuildings, model, bHeight, () => 0)),
    contextBuildings: make('contextBuildings', data.contextBuildings, { surface: 'plain', height: cHeight, base: () => CONTEXT_BASE_M,
      opacity: 0.6, color: () => state.palette.context }),
  };
  (layers.contextBuildings.mesh.material as THREE.Material).depthWrite = true;
  if (model?.sunken.length) GROUND_LAYERS.forEach((id) => openOverSunken(layers[id].mesh.material as THREE.Material));
  outline(scene, layers.supervision, 0.18, 0x6a7390, 0.75);
  outline(scene, layers.reserve, 0.8, 0xc060ff);
  const edges = new THREE.LineSegments(buildingEdges(data.campusBuildings, bHeight, model),
    new THREE.LineBasicMaterial({ color: state.palette.buildingEdge, transparent: true, opacity: 0.45 }));
  edges.position.y = WORLD_LIFT;
  scene.add(edges);
  layers.campusBuildings.extra.push(edges);
  return layers;
}

export interface PlanNodes {
  /** Las piezas del SKP sin relación: del color de los edificios y sin clic. Se enciende y se apaga con ellos. */
  decoration: THREE.Mesh | null;
  /** El color de edificio cambia con la noche y con «edificios en gris». */
  applyTheme: (palette: ScenePalette) => void;
}

/** Un material de superficie con un solo color en vez de colores por vértice, por las dos caras como las mallas del SKP. */
function solid(surface: 'building' | 'green', textures: SceneTextures, color: string): THREE.MeshPhysicalMaterial {
  const material = surfaceMaterial(surface, textures) as THREE.MeshPhysicalMaterial;
  material.vertexColors = false;
  material.color.set(color);
  material.side = THREE.DoubleSide;
  material.shadowSide = THREE.BackSide;
  return material;
}

/** Tierra mate en todos los acabados: el barro no brilla (D-10). */
function earth(map: THREE.Texture, normalMap: THREE.Texture): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0xffffff, map, normalMap, normalScale: new THREE.Vector2(0.9, 0.9), roughness: 0.95, metalness: 0,
    side: THREE.DoubleSide, shadowSide: THREE.BackSide,
  });
}

/**
 * El suelo, los desniveles, la huaca y la decoración del modelo (D-08 a D-10).
 * Se ubican en el anclaje del modelo y nadie los cliquea. El jardín hundido no
 * proyecta sombra, como en la página aprobada.
 */
export function createPlanNodes(scene: THREE.Scene, model: PlanModel, textures: SceneTextures, ground: Stage['modelGround'],
  palette: ScenePalette): PlanNodes {
  const decoration = solid('building', textures, palette.building);
  const materials: Record<PlanNodeKind, THREE.Material> = {
    suelo: ground.top,
    muro: ground.side,
    jardin: solid('green', textures, MODES.base.cats[0].color),
    'huaca-muro': earth(textures.tapial, textures.tapialNormal),
    'huaca-tope': earth(textures.tierra, textures.tierraNormal),
    decoracion: decoration,
  };
  let decorationMesh: THREE.Mesh | null = null;
  for (const [kind, node] of Object.entries(model.nodes) as [PlanNodeKind, PlanNode][]) {
    const mesh = new THREE.Mesh(facetedGeometry(node.positions, node.uv), materials[kind]);
    mesh.position.set(model.offset.x, WORLD_LIFT, model.offset.z);
    mesh.castShadow = kind !== 'jardin';
    mesh.receiveShadow = true;
    scene.add(mesh);
    if (kind === 'decoracion') decorationMesh = mesh;
  }
  return { decoration: decorationMesh, applyTheme: (p) => decoration.color.set(p.building) };
}
