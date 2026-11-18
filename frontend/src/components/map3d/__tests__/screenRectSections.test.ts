import * as THREE from 'three';
import type { SceneData } from '../sceneData';
import { clipRing, ringArea, sectionCodesInScreenRect, sectionInRect, sectionsUnderBuildings } from '../viewer/screenRectSections';
import { WORLD_LIFT } from '../viewer/polyLayer';

const box = (left: number, top: number, right: number, bottom: number) => [
  { x: left, y: top }, { x: right, y: top }, { x: right, y: bottom }, { x: left, y: bottom }];
const rect = (left: number, top: number, right: number, bottom: number) => ({ left, top, right, bottom });

describe('clipRing y ringArea', () => {
  it('mide lo que queda de un cuadrado dentro del rectángulo', () => {
    expect(ringArea(box(0, 0, 10, 10))).toBe(100);
    expect(ringArea(clipRing(box(0, 0, 10, 10), rect(5, -5, 20, 20)))).toBe(50);
    expect(clipRing(box(0, 0, 10, 10), rect(30, 30, 40, 40))).toEqual([]);
  });

  it('mide bien un anillo cóncavo (una L)', () => {
    const l = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 4 }, { x: 4, y: 4 }, { x: 4, y: 10 }, { x: 0, y: 10 }];
    expect(ringArea(l)).toBe(64);
    expect(ringArea(clipRing(l, rect(0, 0, 5, 10)))).toBe(44);
  });
});

describe('sectionInRect', () => {
  // Tres jardines en fila que comparten bordes, como en el campus.
  const west = [box(0, 0, 100, 100)];
  const middle = [box(100, 0, 200, 100)];
  const east = [box(200, 0, 300, 100)];

  it('un rectángulo que envuelve un jardín no se lleva a los vecinos que solo asoman', () => {
    const around = rect(95, -5, 205, 105);
    expect(sectionInRect([middle], around)).toBe(true);
    expect(sectionInRect([west], around)).toBe(false);
    expect(sectionInRect([east], around)).toBe(false);
  });

  it('elige el jardín si queda dentro al menos la mitad', () => {
    expect(sectionInRect([middle], rect(150, -5, 400, 105))).toBe(true);
    expect(sectionInRect([middle], rect(160, -5, 400, 105))).toBe(false);
  });

  it('un clic (rectángulo de pocos píxeles) dentro de un jardín lo elige solo a él', () => {
    const click = rect(147, 47, 153, 53);
    expect(sectionInRect([middle], click)).toBe(true);
    expect(sectionInRect([west], click)).toBe(false);
  });

  it('un clic justo sobre el borde compartido no elige a ninguno de los dos a medias', () => {
    const onBorder = rect(97, 47, 103, 53);
    expect([sectionInRect([west], onBorder), sectionInRect([middle], onBorder)]).toEqual([false, false]);
  });

  it('un rectángulo chico dentro de un jardín grande lo elige', () => {
    expect(sectionInRect([[box(0, 0, 1000, 1000)]], rect(400, 400, 500, 500))).toBe(true);
  });

  it('el hueco de un jardín no cuenta: un rectángulo dentro del hueco no lo elige', () => {
    const ring = [box(0, 0, 300, 300), box(50, 50, 250, 250)];
    expect(sectionInRect([ring], rect(100, 100, 200, 200))).toBe(false);
    expect(sectionInRect([ring], rect(-10, -10, 310, 310))).toBe(true);
  });
});

describe('sectionCodesInScreenRect', () => {
  const section = (code: string, x0: number, y0: number, x1: number, y1: number) => ({
    props: { code }, g: [[[x0, y0, x1, y0, x1, y1, x0, y1]]],
  });
  const data = {
    greenAreas: [section('A', 0, 0, 100, 100), section('B', 100, 0, 200, 100), section('C', 200, 0, 300, 100)],
    xerophytic: [], reserve: [], vegetation: [],
  } as unknown as SceneData;
  const canvas = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 800 }) } as HTMLCanvasElement;
  const fromAbove = () => {
    const camera = new THREE.PerspectiveCamera(90, 1, 1, 5000);
    camera.position.set(150, WORLD_LIFT + 400, -50);
    camera.up.set(0, 0, -1);
    camera.lookAt(150, WORLD_LIFT, -50);
    camera.updateMatrixWorld();
    return camera;
  };
  const toScreen = (camera: THREE.Camera, x: number, y: number) => {
    const p = new THREE.Vector3(x, WORLD_LIFT + 0.8, -y).project(camera);
    return { x: (p.x + 1) * 400, y: (1 - p.y) * 400 };
  };

  it('vista desde arriba: el rectángulo alrededor de B elige solo B', () => {
    const camera = fromAbove();
    const a = toScreen(camera, 95, -5), b = toScreen(camera, 205, 105);
    expect(sectionCodesInScreenRect(data, camera, canvas, a.x, a.y, b.x, b.y, ['A', 'B', 'C'])).toEqual(['B']);
  });

  it('respeta la lista de elegibles', () => {
    const camera = fromAbove();
    const a = toScreen(camera, -5, -5), b = toScreen(camera, 305, 105);
    expect(sectionCodesInScreenRect(data, camera, canvas, a.x, a.y, b.x, b.y, ['A', 'C']).sort()).toEqual(['A', 'C']);
  });

  it('un jardín detrás de la cámara no se elige aunque su reflejo caiga en el rectángulo', () => {
    // Cámara inclinada a ras del suelo, mirando hacia +x desde x = 150: A queda detrás.
    const camera = new THREE.PerspectiveCamera(60, 1, 1, 5000);
    camera.position.set(150, WORLD_LIFT + 5, -50);
    camera.lookAt(400, WORLD_LIFT, -50);
    camera.updateMatrixWorld();
    expect(sectionCodesInScreenRect(data, camera, canvas, 0, 0, 800, 800, ['A'])).toEqual([]);
  });
});

describe('jardines bajo un edificio', () => {
  const square = (code: string, x0: number, y0: number, x1: number, y1: number) => ({
    props: { code }, g: [[[x0, y0, x1, y0, x1, y1, x0, y1]]],
  });
  const building = (x0: number, y0: number, x1: number, y1: number, baseM: number | null = 0, heightM: number | null = 12) => ({
    props: { baseM, heightM }, g: [[[x0, y0, x1, y0, x1, y1, x0, y1]]],
  });
  const scene = (buildings: ReturnType<typeof building>[], context: ReturnType<typeof building>[] = []) => ({
    greenAreas: [
      square('PATIO', 10, 10, 14, 14), // jardinera entera dentro del edificio
      square('MITAD', 30, 0, 50, 20), // la mitad bajo el edificio
      square('BORDE', 60, 0, 80, 20), // apenas un borde bajo techo
      square('LIBRE', 100, 0, 120, 20),
    ],
    xerophytic: [], reserve: [], vegetation: [], campusBuildings: buildings, contextBuildings: context,
  }) as unknown as SceneData;
  const edificios = [building(0, 0, 40, 30), building(55, 0, 63, 20)];

  it('marca los que quedan en su mayor parte bajo techo, no los que solo tienen un borde', () => {
    expect([...sectionsUnderBuildings(scene(edificios))].sort()).toEqual(['MITAD', 'PATIO']);
  });

  it('también cuentan los edificios de alrededor del campus', () => {
    expect([...sectionsUnderBuildings(scene([], [building(95, -5, 125, 25)]))]).toEqual(['LIBRE']);
  });

  it('un edificio hundido, con el techo al nivel del suelo, no tapa el jardín de encima', () => {
    expect(sectionsUnderBuildings(scene([building(0, 0, 40, 30, -9, 8)])).size).toBe(0);
    // Sin altura se dibuja con la de siempre: sí tapa.
    expect([...sectionsUnderBuildings(scene([building(0, 0, 40, 30, null, null)]))].sort()).toEqual(['MITAD', 'PATIO']);
  });

  it('el rectángulo no elige los ocultos aunque los encierre', () => {
    const data = scene(edificios);
    const camera = new THREE.PerspectiveCamera(90, 1, 1, 5000);
    camera.position.set(60, WORLD_LIFT + 400, -10);
    camera.up.set(0, 0, -1);
    camera.lookAt(60, WORLD_LIFT, -10);
    camera.updateMatrixWorld();
    const canvas = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 800 }) } as HTMLCanvasElement;
    const all = ['PATIO', 'MITAD', 'BORDE', 'LIBRE'];
    expect(sectionCodesInScreenRect(data, camera, canvas, 0, 0, 800, 800, all, sectionsUnderBuildings(data)).sort())
      .toEqual(['BORDE', 'LIBRE']);
    expect(sectionCodesInScreenRect(data, camera, canvas, 0, 0, 800, 800, all).sort()).toEqual([...all].sort());
  });
});
