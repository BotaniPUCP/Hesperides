import * as THREE from 'three';
import type { SceneData } from '../sceneData';
import { createLabels } from '../viewer/labels';
import { WORLD_LIFT } from '../viewer/polyLayer';

const WIDTH = 800;
const HEIGHT = 600;

/** Una etiqueta de cada clase, separadas en x para que no se pisen entre sí. */
const data = {
  campusBuildings: [{ props: { name: 'INRAS (Instituto de Radioastronomía)', heightM: 3.2 } }],
  greenAreas: [{ props: { name: 'Jardín de la Paz', mapCode: 'AV-01' } }],
  gates: [{ props: { name: 'Puerta 1' }, p: [60, 0] }],
} as unknown as SceneData;

const buildingMeta = [{ x: -60, z: 0, r: 12, area: 400 }];
const greenMeta = [{ x: 0, z: 0, r: 12, area: 400 }];

/** Cámara a ras del suelo de la maqueta mirando al norte: lo que está sobre el suelo queda arriba del centro. */
function groundLevelCamera(): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(38, WIDTH / HEIGHT, 2, 9000);
  camera.position.set(0, WORLD_LIFT, 150);
  camera.lookAt(0, WORLD_LIFT, 0);
  camera.updateMatrixWorld();
  return camera;
}

function screenY(el: Element): number {
  const match = /translate\([-\d.]+px,\s*([-\d.]+)px\)/.exec((el as HTMLElement).style.transform);
  if (!match) throw new Error(`Etiqueta sin posición: ${el.textContent}`);
  return Number(match[1]);
}

describe('createLabels', () => {
  it.each(['INRAS', 'Jardín de la Paz', 'Puerta 1'])('pone «%s» sobre el suelo de la maqueta, no debajo', (text) => {
    const root = document.createElement('div');
    const labels = createLabels(root, data, buildingMeta, greenMeta);
    labels.update(groundLevelCamera(), WIDTH, HEIGHT, () => true);

    const label = [...root.children].find((el) => el.textContent === text);
    if (!label) throw new Error(`No se creó la etiqueta ${text}`);
    expect((label as HTMLElement).style.visibility).toBe('visible');
    expect(screenY(label)).toBeLessThan(HEIGHT / 2);
  });
});
