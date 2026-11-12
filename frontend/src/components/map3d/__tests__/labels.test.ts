import * as THREE from 'three';
import type { SceneData } from '../sceneData';
import { createLabels, LABEL_MAX_PX, LABEL_TOLERANCE_PX, trimLabel } from '../viewer/labels';
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

describe('trimLabel', () => {
  const measure = (t: string) => t.length * 7;

  it('deja igual lo que cabe', () => {
    expect(trimLabel('Jardín de la Paz', measure)).toBe('Jardín de la Paz');
  });
  it('abrevia con la tabla común', () => {
    expect(trimLabel('Estudios Generales Ciencias', measure)).toBe('EE.GG. Ciencias');
  });
  it('si abreviado apenas se pasa, queda entero dentro de la tolerancia', () => {
    expect(trimLabel('Departamento Académico de Ciencias Sociales', measure)).toBe('Dpto. Ciencias Sociales');
    expect(trimLabel('AULAS MOVILES PSICOLOGÍA', measure)).toBe('AULAS MOVILES PSICOLOGÍA');
  });
  it('escribe las abreviaturas en mayúsculas si el nombre lo está', () => {
    expect(trimLabel('ESTUDIOS GENERALES CIENCIAS', measure)).toBe('EE.GG. CIENCIAS');
  });
  it('se queda con la primera parte antes de un separador', () => {
    const long = 'PABELLÓN I: FACULTAD DE ARTE Y DISEÑO, DEPARTAMENTO ACADÉMICO DE ARTE Y DISEÑO, CIDE';
    expect(trimLabel(long, measure)).toBe('PABELLÓN I');
  });
  it('corta por palabras enteras con «…» sin dejar un conector colgando', () => {
    const texts = [
      'Centro de Investigación y Desarrollo de Tecnologías Limpias Avanzadas',
      'Oficina de Grados y Títulos de la Escuela de Posgrado Universitaria Central',
      'Pabellón de Aulas y Salas de Reunión para la Comunidad Académica Completa',
    ];
    for (const t of texts) {
      const out = trimLabel(t, measure);
      expect(out.endsWith('…')).toBe(true);
      expect(out).not.toMatch(/ (de|y|la|del|para)…$/);
      expect(measure(out)).toBeLessThanOrEqual(LABEL_TOLERANCE_PX);
    }
  });
  it('recorta una palabra de 40 letras a LABEL_MAX_PX con «…»', () => {
    const out = trimLabel('A'.repeat(40), measure);
    expect(out.endsWith('…')).toBe(true);
    expect(measure(out)).toBeLessThanOrEqual(LABEL_MAX_PX);
  });
});

describe('createLabels con recorte', () => {
  const longData = {
    campusBuildings: [{ props: { name: 'Laboratorio de Investigación en Tecnologías Emergentes de Ingeniería', heightM: 3 } }],
    greenAreas: [],
    gates: [{ props: { name: 'Puerta de acceso principal norte del campus universitario' }, p: [60, 0] }],
  } as unknown as SceneData;

  afterEach(() => {
    delete (document as unknown as { fonts?: unknown }).fonts;
    jest.restoreAllMocks();
  });

  it('recorta edificios con el medidor del canvas y no toca las puertas', async () => {
    Object.defineProperty(document, 'fonts', { configurable: true, value: { ready: Promise.resolve() } });
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      font: '',
      measureText: (t: string) => ({ width: t.length * 7 }),
    } as unknown as CanvasRenderingContext2D);
    const root = document.createElement('div');
    createLabels(root, longData, buildingMeta, []);
    await Promise.resolve();
    await Promise.resolve();
    const texts = [...root.children].map((el) => el.textContent ?? '');
    expect(texts).toContain('Puerta de acceso principal norte del campus universitario');
    const building = texts.find((t) => t.startsWith('Lab.'));
    expect(building).toBeDefined();
    expect(building!.length * 7).toBeLessThanOrEqual(LABEL_TOLERANCE_PX);
  });

  it('sin canvas ni fuentes deja los nombres completos y no escribe en consola', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const root = document.createElement('div');
    createLabels(root, longData, buildingMeta, []);
    expect([...root.children].map((el) => el.textContent)).toContain(
      'Laboratorio de Investigación en Tecnologías Emergentes de Ingeniería',
    );
    expect(spy).not.toHaveBeenCalled();
  });
});
