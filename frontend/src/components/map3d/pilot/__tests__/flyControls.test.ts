import * as THREE from 'three';
import { attachFlyControls } from '../flyControls';

/** Cuadros de animación a mano: cada `frame(ms)` corre el siguiente con ese sello. */
let pending: FrameRequestCallback | null = null;
const frame = (ms: number) => {
  const run = pending;
  pending = null;
  run?.(ms);
};

beforeEach(() => {
  pending = null;
  jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => { pending = cb; return 1; });
  jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => { pending = null; });
  jest.spyOn(performance, 'now').mockReturnValue(1000);
});

afterEach(() => jest.restoreAllMocks());

/** Cámara a `height` m del piso mirando al norte, con lo que mira a `ahead` m. */
function setup(height: number, ahead: number) {
  const element = document.createElement('div');
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(0, height, 0);
  const target = new THREE.Vector3(0, height, -ahead);
  camera.lookAt(target);
  const fly = attachFlyControls(element, camera, target, () => {});
  fly.fitTo(0, 80);
  fly.setEnabled(true);
  return { element, camera, target };
}

function holdW(element: HTMLElement, frames: number[]) {
  element.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
  frames.forEach(frame);
  element.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }));
}

describe('vuelo del modo administrador', () => {
  it('de cerca, un cuarto de segundo avanza menos de un metro, sin saltos', () => {
    const { element, camera } = setup(1.7, 20);
    holdW(element, [1050, 1100, 1150, 1200, 1250]);
    expect(-camera.position.z).toBeGreaterThan(0.2);
    expect(-camera.position.z).toBeLessThan(1);
  });

  it('de lejos sigue cruzando el campus rápido', () => {
    const { element, camera } = setup(300, 400);
    holdW(element, [1050, 1100, 1150, 1200, 1250]);
    expect(-camera.position.z).toBeCloseTo(10, 0);
  });

  it('un primer cuadro con sello anterior a la pulsación no mueve hacia atrás', () => {
    const { element, camera } = setup(1.7, 20);
    holdW(element, [990]);
    expect(camera.position.z).toBeLessThanOrEqual(0);
  });

  it('mueve la cámara y el centro de la órbita juntos', () => {
    const { element, camera, target } = setup(10, 30);
    holdW(element, [1100]);
    expect(target.z - camera.position.z).toBeCloseTo(-30);
  });
});
