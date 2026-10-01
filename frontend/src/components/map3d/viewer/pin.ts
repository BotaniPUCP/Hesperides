import * as THREE from 'three';

/** Marcador del punto pulsado: un cono azul invertido, el del prototipo v39. */

const PIN_COLOR = 0x0033ff;

export interface Pin {
  show: (x: number, y: number, z: number) => void;
  hide: () => void;
}

export function createPin(scene: THREE.Scene): Pin {
  const group = new THREE.Group();
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(2.2, 7, 16),
    new THREE.MeshStandardMaterial({ color: PIN_COLOR, roughness: 0.34, metalness: 0.04 }),
  );
  cone.rotation.x = Math.PI;
  cone.position.y = 3.5;
  cone.renderOrder = 21;
  group.add(cone);
  group.visible = false;
  scene.add(group);
  return {
    show: (x, y, z) => {
      group.position.set(x, y + 0.12, z);
      group.visible = true;
    },
    hide: () => {
      group.visible = false;
    },
  };
}
