import * as THREE from 'three';
import { fitDistance, framingTarget, sectionPoints } from '../viewer/frameFit';
import type { Polygon } from '../sceneData';

const square = (half: number) => [{ x: -half, z: -half }, { x: half, z: -half }, { x: half, z: half }, { x: -half, z: half }];
const tilted = new THREE.Vector3(0, 0.8, 0.6).normalize();
const view = (aspect: number) => ({ fovDeg: 90, aspect, fill: 1 });

describe('fitDistance', () => {
  it('visto casi desde arriba con 90° de campo, un cuadrado de ±10 m entra a ~10 m', () => {
    const fromAbove = new THREE.Vector3(0, 1, 1e-6).normalize();
    expect(fitDistance(square(10), new THREE.Vector3(), fromAbove, view(1))).toBeCloseTo(10, 3);
  });

  it('cada punto queda dentro del encuadre y al menos uno toca el borde (el área llena la vista)', () => {
    const target = new THREE.Vector3();
    const d = fitDistance(square(50), target, tilted, view(1.6));
    const camera = new THREE.PerspectiveCamera(90, 1.6, 0.1, 10000);
    camera.position.copy(target).addScaledVector(tilted, d);
    camera.lookAt(target);
    camera.updateMatrixWorld();
    const ndc = square(50).map((p) => new THREE.Vector3(p.x, 0, p.z).project(camera));
    ndc.forEach((p) => { expect(Math.abs(p.x)).toBeLessThanOrEqual(1 + 1e-9); expect(Math.abs(p.y)).toBeLessThanOrEqual(1 + 1e-9); });
    expect(Math.max(...ndc.map((p) => Math.max(Math.abs(p.x), Math.abs(p.y))))).toBeCloseTo(1, 6);
  });

  it('un área más chica se mira más de cerca', () => {
    const target = new THREE.Vector3();
    expect(fitDistance(square(20), target, tilted, view(1))).toBeLessThan(fitDistance(square(200), target, tilted, view(1)));
  });

  it('dejar margen aleja la cámara', () => {
    const target = new THREE.Vector3();
    expect(fitDistance(square(20), target, tilted, { ...view(1), fill: 0.8 })).toBeGreaterThan(fitDistance(square(20), target, tilted, view(1)));
  });
});

describe('framingTarget', () => {
  it('apunta al centro del rectángulo que envuelve los puntos', () => {
    expect(framingTarget([{ x: 0, z: 0 }, { x: 100, z: -40 }], 3)).toEqual(new THREE.Vector3(50, 3, -20));
  });
});

describe('sectionPoints', () => {
  const ring = (...xy: number[]) => xy;
  const sections = [
    { g: [[ring(0, 0, 10, 0, 10, 10)]] as Polygon[], props: { code: 'AV-01' } },
    { g: [[ring(500, 500, 510, 500, 510, 510)]] as Polygon[], props: { code: 'AV-99' } },
  ];

  it('toma los vértices del contorno exterior de las áreas pedidas, con z = -y', () => {
    expect(sectionPoints(sections, new Set(['AV-01']))).toEqual([{ x: 0, z: -0 }, { x: 10, z: -0 }, { x: 10, z: -10 }]);
  });

  it('sin áreas reconocidas no hay puntos', () => {
    expect(sectionPoints(sections, new Set(['XX']))).toEqual([]);
  });
});
