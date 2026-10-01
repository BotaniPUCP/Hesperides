import * as THREE from 'three';
import type { VegetationProperties } from '@shared/types';
import { plantShape, type PlantShape } from '../plantShape';
import type { ScenePoint } from '../sceneData';
import type { PointLayer } from './furniture';
import { WORLD_LIFT } from './polyLayer';

/**
 * La vegetación del catastro como instancias, con las formas del prototipo
 * v39: copa redonda, plana, alta, en cono o de palmera, tronco en árboles y
 * palmeras altas, y una sombra de contacto que la asienta en el suelo.
 */

type Crown = 'ico' | 'palm' | 'cone';

const GEOMETRY: Record<Crown, () => THREE.BufferGeometry> = {
  ico: () => new THREE.IcosahedronGeometry(1, 1),
  palm: () => new THREE.IcosahedronGeometry(1, 0),
  cone: () => new THREE.ConeGeometry(1, 1, 8).translate(0, 0.5, 0),
};
const TRUNK_COLOR = 0x5c3318;
const CONTACT_OPACITY = 0.18;
/** El reflejo del cielo aclara el follaje hasta dejarlo casi blanco: el prototipo lo baja igual. */
const FOLIAGE_ENV = 0.05;

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

export function createVegetationLayer(scene: THREE.Scene, plants: ScenePoint<VegetationProperties>[]): PointLayer {
  const shapes = plants.map((p) => plantShape(p.props));
  const colors = shapes.map((s) => `#${new THREE.Color(s.color).offsetHSL(...s.jitter).getHexString()}`);
  const layer: PointLayer = {
    id: 'vegetation', kind: 'inst', count: plants.length, meshes: [], slots: [], items: [], scaleRange: [1, 1],
    color: (i) => colors[i], meta: plants.map((p) => ({ x: p.p[0], z: -p.p[1], r: 25, area: 0 })),
  };
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
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true, roughness: 0.6, envMapIntensity: FOLIAGE_ENV });
    const mesh = instanced(scene, GEOMETRY[crown](), mat, idx.length);
    pickable(mesh, idx);
    idx.forEach((i, k) => {
      const [x, y] = plants[i].p;
      dummy.position.set(x, 0, -y);
      dummy.rotation.set(0, (i * 2.39) % 6.28, 0);
      placeCrown(shapes[i], isWoody(plants[i].props), plants[i].props.typeCode === 'TREE');
      dummy.updateMatrix();
      mesh.setMatrixAt(k, dummy.matrix);
      mesh.setColorAt(k, new THREE.Color(colors[i]));
      layer.slots[i] = { mesh, k };
    });
  }

  const trunks = shapes.map((s, i) => (s.trunk ? i : -1)).filter((i) => i >= 0);
  if (trunks.length) {
    const mesh = instanced(scene, new THREE.CylinderGeometry(0.5, 0.8, 1, 7).translate(0, 0.5, 0),
      new THREE.MeshStandardMaterial({ color: TRUNK_COLOR, roughness: 0.7, envMapIntensity: FOLIAGE_ENV }), trunks.length);
    pickable(mesh, trunks);
    trunks.forEach((i, k) => {
      const s = shapes[i];
      const radius = s.shape === 'palm' ? THREE.MathUtils.clamp(s.heightM / 45, 0.18, 0.4) : THREE.MathUtils.clamp(s.crownRadiusM / 9, 0.15, 0.45);
      dummy.position.set(plants[i].p[0], 0, -plants[i].p[1]);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(radius, s.shape === 'palm' ? s.heightM : s.heightM * 0.75, radius);
      dummy.updateMatrix();
      mesh.setMatrixAt(k, dummy.matrix);
    });
  }

  // La sombra de contacto no se elige: no lleva capa en userData y el clic la atraviesa.
  const contact = instanced(scene, new THREE.CircleGeometry(1, 16).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: CONTACT_OPACITY, depthWrite: false }), plants.length);
  contact.renderOrder = -0.2;
  layer.meshes.push(contact);
  shapes.forEach((s, i) => {
    const spread = s.shape === 'palm' ? 1.2 : isWoody(plants[i].props) ? 1 : 0.75;
    dummy.position.set(plants[i].p[0], 0.05, -plants[i].p[1]);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(Math.max(0.5, s.crownRadiusM * spread), 1, Math.max(0.4, s.crownRadiusM * spread * 0.8));
    dummy.updateMatrix();
    contact.setMatrixAt(i, dummy.matrix);
  });
  return layer;
}
