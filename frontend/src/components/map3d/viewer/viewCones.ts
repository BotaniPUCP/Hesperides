import * as THREE from 'three';
import { WORLD_LIFT } from './polyLayer';

/**
 * Conos de vista de las perspectivas: una cuña en el suelo que sale del punto
 * donde se tomaron las fotos y se abre hacia donde miran, como en un mapa de
 * calles. Así se ve de un vistazo desde qué lado está cada foto.
 */

/** Una perspectiva en coordenadas de lat/lon, como llega de la API. */
export interface ViewCone {
  id: number;
  lat: number;
  lon: number;
  /** 0 al norte, creciendo hacia el este. */
  headingDeg: number;
}

const RADIUS_M = 16;
const FIELD_OF_VIEW_RAD = THREE.MathUtils.degToRad(60);
/** Sobre el césped y las veredas, para que no parpadee con ellos. */
const LIFT_M = 0.45;
const COLOR = 0x1d4ed8;
const HIGHLIGHT = 0xf59e0b;
const OPACITY = 0.42;
const HIGHLIGHT_OPACITY = 0.75;

export interface ViewCones {
  set: (cones: { id: number; x: number; z: number; headingDeg: number }[]) => void;
  highlight: (id: number | null) => void;
  position: (id: number) => THREE.Vector3 | null;
  dispose: () => void;
}

/**
 * En la escena el norte es -z. Tras tumbar el círculo (rotación -90° en x), el
 * ángulo t del círculo apunta a (cos t, 0, -sin t): el rumbo h queda en t = 90° - h.
 */
function wedge(headingDeg: number): THREE.BufferGeometry {
  const centre = Math.PI / 2 - THREE.MathUtils.degToRad(headingDeg);
  const geo = new THREE.CircleGeometry(RADIUS_M, 20, centre - FIELD_OF_VIEW_RAD / 2, FIELD_OF_VIEW_RAD);
  geo.rotateX(-Math.PI / 2);
  return geo;
}

export function createViewCones(scene: THREE.Scene): ViewCones {
  const group = new THREE.Group();
  scene.add(group);
  const meshes = new Map<number, THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>>();
  const dot = new THREE.SphereGeometry(1.1, 12, 8);

  function clear() {
    meshes.forEach((m) => { m.geometry.dispose(); m.material.dispose(); });
    meshes.clear();
    group.clear();
  }

  return {
    set(cones) {
      clear();
      cones.forEach((c) => {
        // Sin prueba de profundidad: es un marcador, como los nombres; un edificio no debe taparlo.
        const material = new THREE.MeshBasicMaterial({ color: COLOR, transparent: true, opacity: OPACITY, depthWrite: false, depthTest: false, side: THREE.DoubleSide });
        const mesh = new THREE.Mesh(wedge(c.headingDeg), material);
        mesh.position.set(c.x, WORLD_LIFT + LIFT_M, c.z);
        mesh.renderOrder = 20;
        mesh.add(new THREE.Mesh(dot, material));
        meshes.set(c.id, mesh);
        group.add(mesh);
      });
    },
    highlight(id) {
      meshes.forEach((m, key) => {
        m.material.color.setHex(key === id ? HIGHLIGHT : COLOR);
        m.material.opacity = key === id ? HIGHLIGHT_OPACITY : OPACITY;
      });
    },
    position: (id) => meshes.get(id)?.position.clone() ?? null,
    dispose() {
      clear();
      dot.dispose();
      scene.remove(group);
    },
  };
}
