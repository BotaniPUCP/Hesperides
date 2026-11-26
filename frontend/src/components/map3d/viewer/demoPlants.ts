import * as THREE from 'three';
import type { LocalPlane } from '../projection';
import { WORLD_LIFT } from './polyLayer';
import type { DemoPlant, DemoPlantKind } from './viewerTypes';

export const DEMO_PLANT_HEIGHT: Record<DemoPlantKind, number> = { tree: 12, palm: 15, shrub: 4 };

/** Identifiable demo models; entirely separate from the map's specimen meshes and picking. */
export function createDemoPlants(parent: THREE.Group, plane: LocalPlane) {
  const group = new THREE.Group();
  group.position.y = WORLD_LIFT;
  parent.add(group);

  const crowns: Record<DemoPlantKind, THREE.BufferGeometry> = {
    tree: new THREE.IcosahedronGeometry(1, 1).scale(5, 5, 5).translate(0, 7, 0),
    palm: new THREE.ConeGeometry(5, 2.8, 7).translate(0, 13, 0),
    shrub: new THREE.IcosahedronGeometry(1, 1).scale(4, 2, 4).translate(0, 2, 0),
  };
  const trunk = new THREE.CylinderGeometry(0.36, 0.65, 1, 7).translate(0, 0.5, 0);
  const ring = new THREE.RingGeometry(2.7, 3.5, 24).rotateX(-Math.PI / 2).translate(0, 0.25, 0);
  const leaf = new THREE.MeshStandardMaterial({ color: '#16bca8', flatShading: true });
  const bark = new THREE.MeshStandardMaterial({ color: '#624934' });
  const highlight = new THREE.MeshBasicMaterial({ color: '#146c64' });

  return {
    set(plants: readonly DemoPlant[]) {
      group.clear();
      for (const { kind, lat, lon } of plants) {
        const { x, y } = plane.toPlane(lat, lon);
        const plant = new THREE.Group();
        plant.position.set(x, 0, -y);
        plant.add(new THREE.Mesh(crowns[kind], leaf), new THREE.Mesh(ring, highlight));
        if (kind !== 'shrub') {
          const stem = new THREE.Mesh(trunk, bark);
          stem.scale.y = kind === 'palm' ? 13 : 6;
          plant.add(stem);
        }
        group.add(plant);
      }
    },
    dispose() {
      group.clear();
      group.removeFromParent();
      [...Object.values(crowns), trunk, ring, leaf, bark, highlight].forEach((resource) => resource.dispose());
    },
  };
}
