import * as THREE from 'three';
import type { VegetationProperties } from '@shared/types';
import { plantShape, type PlantShape } from '../plantShape';
import type { ScenePoint } from '../sceneData';
import type { FoliageMaterials } from './foliageMaterials';
import type { PointLayer } from './furniture';
import { sunkenFloorAt, type SunkenArea } from './planModel';
import { WORLD_LIFT } from './polyLayer';
import { coniferCrown, frondTexture, leafMaterials, leafTexture, leafyCrown, palmCrown, PICK_ONLY_LAYER, trunkGeometry } from './sunsetTrees';

/**
 * La vegetación del catastro como instancias, con las formas y materiales del
 * prototipo v39: copa redonda, plana, alta, en cono o de palmera con borde
 * iluminado y halo, tronco en árboles y palmeras altas, y sombra de contacto.
 * Una planta dentro de un desnivel se apoya en su piso (SPEC-108 D-09).
 */

type Crown = 'ico' | 'palm' | 'cone';

const GEOMETRY: Record<Crown, () => THREE.BufferGeometry> = {
  ico: () => new THREE.IcosahedronGeometry(1, 1),
  palm: () => new THREE.IcosahedronGeometry(1, 0),
  cone: () => new THREE.ConeGeometry(1, 1, 8).translate(0, 0.5, 0),
};
/** El halo es la misma copa algo más grande, vista por dentro. */
const GLOW_SCALE: Record<Crown, number> = { ico: 1.085, palm: 1.12, cone: 1.09 };
const TRUNK_COLOR = 0x5c3318;

const crownOf = (s: PlantShape): Crown => (s.shape === 'palm' ? 'palm' : s.shape === 'cone' ? 'cone' : 'ico');
const isWoody = (p: VegetationProperties) => p.typeCode === 'TREE' || p.typeCode === 'PALM';

const dummy = new THREE.Object3D();

/** Posición y escala de la copa: cada forma se apoya distinto sobre su altura. */
function placeCrown(s: PlantShape, woody: boolean, tree: boolean) {
  const { heightM: h, crownRadiusM: r } = s;
  if (s.shape === 'palm') { dummy.position.y = h; dummy.scale.set(r, r * 0.42, r); return; }
  if (s.shape === 'cone') { const ch = tree ? h * 0.82 : h; dummy.position.y = h - ch; dummy.scale.set(r, ch, r); return; }
  if (s.shape === 'flat') { dummy.position.y = h - r * 0.35; dummy.scale.set(r, r * 0.45, r); return; }
  if (s.shape === 'tall' || s.shape === 'column') { const cy = h * 0.4; dummy.position.y = h - cy; dummy.scale.set(r, cy, r); return; }
  if (woody) { dummy.position.y = h - r * 0.8; dummy.scale.set(r, r * 0.85, r); return; }
  dummy.position.y = h * 0.5;
  dummy.scale.set(r, h * 0.5, r);
}

function instanced(scene: THREE.Scene, geo: THREE.BufferGeometry, mat: THREE.Material, count: number) {
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.position.y = WORLD_LIFT;
  scene.add(mesh);
  return mesh;
}

/** La capa, y el cambio a los árboles del Atardecer (`sunsetTrees.ts`). */
export interface VegetationLayer extends PointLayer {
  setGolden: (on: boolean) => void;
}

export function createVegetationLayer(
  scene: THREE.Scene,
  plants: ScenePoint<VegetationProperties>[],
  materials: FoliageMaterials,
  sunken: SunkenArea[] = [],
): VegetationLayer {
  const shapes = plants.map((p) => plantShape(p.props));
  const floor = plants.map((p) => sunkenFloorAt(sunken, p.p[0], p.p[1]));
  const colors = shapes.map((s) => `#${new THREE.Color(s.color).offsetHSL(...s.jitter).getHexString()}`);
  // Los del Atardecer se arman recién la primera vez que se prende el modo.
  let golden: THREE.Group | null = null;
  const layer: VegetationLayer = {
    id: 'vegetation', kind: 'inst', count: plants.length, meshes: [], slots: [], items: [], scaleRange: [1, 1],
    color: (i) => colors[i], meta: plants.map((p) => ({ x: p.p[0], z: -p.p[1], r: 25, area: 0 })),
    // Las copas de siempre quedan para el clic (la cámara no las dibuja); se ven los árboles del Atardecer.
    setGolden(on) {
      if (on && !golden) golden = createGoldenVegetation(scene, plants, shapes, floor, colors, materials);
      layer.meshes.forEach((m) => m.layers.set(on ? PICK_ONLY_LAYER : 0));
      if (!golden) return;
      // Con la capa apagada desde el panel, tampoco se ven.
      golden.visible = on && (layer.meshes[0]?.visible ?? true);
    },
  };
  // Las mallas auxiliares (halo, sombra) se encienden con la capa pero el clic
  // las atraviesa: no llevan la capa en userData.
  const auxiliary = (mesh: THREE.InstancedMesh) => layer.meshes.push(mesh);
  const pickable = (mesh: THREE.InstancedMesh, map: number[]) => {
    mesh.castShadow = true;
    mesh.userData = { layer, map };
    layer.meshes.push(mesh);
  };

  const groups: Record<Crown, number[]> = { ico: [], palm: [], cone: [] };
  shapes.forEach((s, i) => groups[crownOf(s)].push(i));
  for (const crown of Object.keys(groups) as Crown[]) {
    const idx = groups[crown];
    if (!idx.length) continue;
    const mesh = instanced(scene, GEOMETRY[crown](), materials.foliage(), idx.length);
    const glow = instanced(scene, GEOMETRY[crown](), materials.glow, idx.length);
    pickable(mesh, idx);
    auxiliary(glow);
    idx.forEach((i, k) => {
      const [x, y] = plants[i].p;
      dummy.position.set(x, 0, -y);
      dummy.rotation.set(0, (i * 2.39) % 6.28, 0);
      placeCrown(shapes[i], isWoody(plants[i].props), plants[i].props.typeCode === 'TREE');
      dummy.position.y += floor[i];
      dummy.updateMatrix();
      mesh.setMatrixAt(k, dummy.matrix);
      mesh.setColorAt(k, new THREE.Color(colors[i]));
      layer.slots[i] = { mesh, k };
      dummy.scale.multiplyScalar(GLOW_SCALE[crown]);
      if (crown === 'cone') dummy.scale.y *= 1.04;
      dummy.updateMatrix();
      glow.setMatrixAt(k, dummy.matrix);
    });
  }

  const trunks = shapes.map((s, i) => (s.trunk ? i : -1)).filter((i) => i >= 0);
  if (trunks.length) {
    const mesh = instanced(scene, new THREE.CylinderGeometry(0.5, 0.8, 1, 7).translate(0, 0.5, 0),
      new THREE.MeshStandardMaterial({ color: TRUNK_COLOR, roughness: 0.7, metalness: 0 }), trunks.length);
    pickable(mesh, trunks);
    trunks.forEach((i, k) => {
      const s = shapes[i];
      const radius = s.shape === 'palm' ? THREE.MathUtils.clamp(s.heightM / 45, 0.18, 0.4) : THREE.MathUtils.clamp(s.crownRadiusM / 9, 0.15, 0.45);
      dummy.position.set(plants[i].p[0], floor[i], -plants[i].p[1]);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(radius, s.shape === 'palm' ? s.heightM : s.heightM * 0.75, radius);
      dummy.updateMatrix();
      mesh.setMatrixAt(k, dummy.matrix);
    });
  }

  const contact = instanced(scene, new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), materials.contact, plants.length);
  contact.renderOrder = -0.2;
  auxiliary(contact);
  shapes.forEach((s, i) => {
    const woody = isWoody(plants[i].props), palm = s.shape === 'palm';
    dummy.position.set(plants[i].p[0], floor[i] + 0.05, -plants[i].p[1]);
    dummy.rotation.set(0, (i * 1.37) % Math.PI, 0);
    dummy.scale.set(Math.max(0.95, s.crownRadiusM * (palm ? 2.4 : woody ? 2.05 : 1.55)), 1,
      Math.max(0.75, s.crownRadiusM * (palm ? 1.7 : woody ? 1.8 : 1.35)));
    dummy.updateMatrix();
    contact.setMatrixAt(i, dummy.matrix);
  });
  return layer;
}

/** Más oliva y algo más oscuro: el verde del mapa es para leerlo, no el de una foto al atardecer. */
const OLIVE = new THREE.Color('#4f6a33');
const goldenTint = (hex: string) => new THREE.Color(hex).lerp(OLIVE, 0.5).multiplyScalar(0.9);
const BROADLEAF_VARIANTS = 4;

/** Los árboles del Atardecer, en las mismas posiciones y escalas que los de siempre; empiezan ocultos. */
function createGoldenVegetation(scene: THREE.Scene, plants: ScenePoint<VegetationProperties>[], shapes: PlantShape[], floor: number[],
  colors: string[], materials: FoliageMaterials): THREE.Group {
  const group = new THREE.Group();
  group.position.y = WORLD_LIFT;
  group.visible = false;
  scene.add(group);
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, list: number[], place: (i: number) => void, tint?: (i: number) => THREE.Color) => {
    if (!list.length) return;
    const mesh = new THREE.InstancedMesh(geo, mat, list.length);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.raycast = () => undefined;
    list.forEach((i, k) => {
      dummy.position.set(plants[i].p[0], 0, -plants[i].p[1]);
      dummy.rotation.set(0, (i * 2.39) % 6.28, 0);
      dummy.scale.set(1, 1, 1);
      place(i);
      dummy.position.y += floor[i];
      dummy.updateMatrix();
      mesh.setMatrixAt(k, dummy.matrix);
      if (tint) mesh.setColorAt(k, tint(i));
    });
    group.add(mesh);
  };
  const foliage = () => { const m = materials.foliage(); m.vertexColors = true; return m; };
  const tint = (i: number) => goldenTint(colors[i]);
  const crown = (i: number) => placeCrown(shapes[i], isWoody(plants[i].props), plants[i].props.typeCode === 'TREE');

  const palms = shapes.map((s, i) => (s.shape === 'palm' ? i : -1)).filter((i) => i >= 0);
  const cones = shapes.map((s, i) => (s.shape === 'cone' ? i : -1)).filter((i) => i >= 0);
  const broad = shapes.map((s, i) => (s.shape !== 'palm' && s.shape !== 'cone' ? i : -1)).filter((i) => i >= 0);

  // Copas de hoja ancha frondosas: tarjetas de hojas con el material del follaje (y su borde al sol).
  const leaves = leafTexture();
  for (let v = 0; v < BROADLEAF_VARIANTS; v++) {
    const { material, depth } = leafMaterials(leaves, foliage());
    const before = group.children.length;
    add(leafyCrown(0xb10a + v * 977), material, broad.filter((i) => i % BROADLEAF_VARIANTS === v), crown, (i) => tint(i).multiplyScalar(1.7));
    group.children.slice(before).forEach((m) => { (m as THREE.Mesh).customDepthMaterial = depth; });
  }
  add(coniferCrown(0xc0f1), foliage(), cones, crown, tint);

  // Palmeras: el penacho arriba del tronco, y frondas recortadas por la textura (también en la sombra).
  const fronds = frondTexture();
  const palmMat = new THREE.MeshStandardMaterial({ map: fronds, alphaTest: 0.45, side: THREE.DoubleSide, vertexColors: true, roughness: 0.75 });
  const palmDepth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: fronds, alphaTest: 0.45 });
  const before = group.children.length;
  add(palmCrown(0x9a1), palmMat, palms, (i) => {
    const { heightM: h, crownRadiusM: r } = shapes[i];
    dummy.position.y = h * 0.97;
    dummy.scale.set(r * 1.15, r * 0.95, r * 1.15);
  }, (i) => goldenTint(colors[i]).multiplyScalar(1.1));
  group.children.slice(before).forEach((m) => { (m as THREE.Mesh).customDepthMaterial = palmDepth; });

  // Troncos: los de palmera, largos, finos y algo curvos; los demás, hasta la copa.
  const bark = new THREE.MeshStandardMaterial({ color: '#5a4636', roughness: 0.92 });
  const palmBark = new THREE.MeshStandardMaterial({ color: '#8b7d6b', roughness: 0.9 });
  const trunks = shapes.map((s, i) => (s.trunk ? i : -1)).filter((i) => i >= 0);
  [0, 2.5, 5].forEach((bend, b) => add(trunkGeometry(bend), palmBark, trunks.filter((i) => shapes[i].shape === 'palm' && i % 3 === b), (i) => {
    const s = shapes[i];
    const r = THREE.MathUtils.clamp(s.heightM / 45, 0.16, 0.34);
    dummy.scale.set(r, s.heightM, r);
  }));
  add(trunkGeometry(0), bark, trunks.filter((i) => shapes[i].shape !== 'palm'), (i) => {
    const s = shapes[i];
    const r = THREE.MathUtils.clamp(s.crownRadiusM / 10, 0.12, 0.4);
    dummy.scale.set(r, s.heightM * 0.7, r);
  });
  return group;
}
