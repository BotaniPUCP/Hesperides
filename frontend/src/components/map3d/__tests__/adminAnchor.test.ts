import * as THREE from 'three';
import { ADMIN_ANCHOR_MAX_M, attachAdminAnchor, chooseAnchorDistance } from '../viewer/adminAnchor';

const hit = (distance: number) => ({ distance });

describe('anclaje del modo administrador: lo que se ve al centro de la pantalla', () => {
  it('se ancla en lo primero visible que cruza el centro', () => {
    expect(chooseAnchorDistance([hit(40), hit(90)], 300, 2)).toBe(40);
  });

  it('sin nada al frente, se ancla en el suelo que se ve', () => {
    expect(chooseAnchorDistance([], 120, 2)).toBe(120);
  });

  it('lo que está más lejos que el límite no cuenta: mirando al horizonte el anclaje no cambia', () => {
    expect(chooseAnchorDistance([hit(ADMIN_ANCHOR_MAX_M + 1)], null, 2)).toBeNull();
    expect(chooseAnchorDistance([], ADMIN_ANCHOR_MAX_M + 1, 2)).toBeNull();
  });

  it('lo que está más cerca que lo que la cámara dibuja no cuenta: se ancla en lo que se ve detrás', () => {
    expect(chooseAnchorDistance([hit(0.1), hit(1.5), hit(12)], 300, 2)).toBe(12);
    expect(chooseAnchorDistance([hit(0.3)], 0.8, 2)).toBeNull();
  });
});

/** Cámara en el origen mirando al norte (-Z), con el piso de un techo 10 m adelante. */
function scene() {
  const world = new THREE.Scene();
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(50, 50), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
  wall.position.set(0, 0, -10);
  world.add(wall);
  const camera = new THREE.PerspectiveCamera(38, 1, 2, 9000);
  camera.lookAt(0, 0, -1);
  camera.updateMatrixWorld();
  return { world, camera };
}

function lookDirection(camera: THREE.Camera, target: THREE.Vector3) {
  return target.clone().sub(camera.position).normalize();
}

describe('re-anclar nunca gira la vista (grabación del 16 nov: saltos de 100 a 180°)', () => {
  it('una línea que pasa a medio metro sobre la cámara no se lleva el anclaje', () => {
    const { world, camera } = scene();
    const edge = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-5, 0.4, -0.2), new THREE.Vector3(5, 0.4, -0.2),
    ]), new THREE.LineBasicMaterial());
    world.add(edge);
    world.updateMatrixWorld();
    const target = new THREE.Vector3(0, 0, -3);

    const anchor = attachAdminAnchor(document.createElement('div'), camera, target, world, () => {});
    anchor.setEnabled(true);

    expect(target.x).toBeCloseTo(0);
    expect(target.y).toBeCloseTo(0);
    expect(target.z).toBeCloseTo(-10);
    expect(lookDirection(camera, target).z).toBeCloseTo(-1);
  });

  it('una malla a un metro, que la cámara no dibuja, tampoco', () => {
    const { world, camera } = scene();
    const close = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
    close.position.set(0, 0, -1);
    world.add(close);
    world.updateMatrixWorld();
    const target = new THREE.Vector3(0, 0, -3);

    attachAdminAnchor(document.createElement('div'), camera, target, world, () => {}).setEnabled(true);

    expect(target.z).toBeCloseTo(-10);
  });
});
