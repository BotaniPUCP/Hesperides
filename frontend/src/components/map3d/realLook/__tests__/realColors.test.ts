import * as THREE from 'three';
import { buildLookTable } from '../lookTable';
import { createRealColors } from '../realColors';
import type { BuildingLook } from '../types';
import type { PolyLayer } from '../../viewer/polyLayer';

/** Dos edificios de un triángulo vertical cada uno, más uno vacío al medio. */
function fakeLayer(): PolyLayer {
  const tri = [0, 0, -10, 10, 0, -10, 0, 5, -10];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([...tri, ...tri]), 3));
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial());
  return { mesh, starts: [0, 3, 3, 6], tone: new Float32Array(6).fill(0.8) } as unknown as PolyLayer;
}

const square = [[[0, 0, 10, 0, 10, 10, 0, 10]]];
const look: BuildingLook = {
  planKey: 'con-ficha', name: 'Con ficha', folder: 'x', photos: ['frente.jpg'],
  materials: { blanco: { color: '#ffffff' }, gris: { color: '#cccccc' } },
  zones: [{ id: 'base', wall: 'blanco', roof: 'gris' }],
};
const buildings = [{ planKey: 'con-ficha', g: square }, { planKey: null, g: square }, { planKey: 'sin-ficha', g: square }];

describe('createRealColors', () => {
  it('marca solo los edificios con ficha', () => {
    const real = createRealColors(fakeLayer(), buildings, [look]);
    expect([0, 1, 2].map(real.hasLook)).toEqual([true, false, false]);
  });

  it('los vértices sin ficha llevan la fila −1', () => {
    const layer = fakeLayer();
    createRealColors(layer, buildings, [look]);
    const row = (layer.mesh.geometry as THREE.BufferGeometry).attributes.aLookRow.array as Float32Array;
    expect([...row.slice(0, 3)].every((r) => r >= 0)).toBe(true);
    expect([...row.slice(3)]).toEqual([-1, -1, -1]);
  });

  it('cambiar de modo cambia el material y no la geometría', () => {
    const layer = fakeLayer();
    const geometry = layer.mesh.geometry;
    const today = layer.mesh.material;
    const real = createRealColors(layer, buildings, [look]);
    real.setEnabled(true);
    expect(Array.isArray(layer.mesh.material)).toBe(true);
    expect(layer.mesh.geometry).toBe(geometry);
    expect(geometry.groups).toEqual([{ start: 0, count: 3, materialIndex: 1 }, { start: 3, count: 3, materialIndex: 0 }]);
    real.setEnabled(false);
    expect(layer.mesh.material).toBe(today);
    expect(geometry.groups).toEqual([]);
  });

  it('la escalera de un edificio con ficha (desde stairFrom) lleva el techo de su zona, aunque sus caras sean verticales', () => {
    const layer = fakeLayer();
    const roof = buildLookTable([look]).zones.get('con-ficha')![0].roof;

    createRealColors(layer, [{ ...buildings[0], stairFrom: 0 }, buildings[1], buildings[2]], [look]);

    const row = (layer.mesh.geometry as THREE.BufferGeometry).attributes.aLookRow.array as Float32Array;
    expect([...row.slice(0, 3)]).toEqual([roof, roof, roof]);
  });

  it('cada vértice lleva su altura sobre el vértice más bajo de su edificio (SPEC-112 D-20)', () => {
    const layer = fakeLayer();
    const position = (layer.mesh.geometry as THREE.BufferGeometry).attributes.position.array as Float32Array;
    position.set([0, 3, -10, 10, 3, -10, 0, 9, -10], 9);
    createRealColors(layer, buildings, [look]);
    const lift = (layer.mesh.geometry as THREE.BufferGeometry).attributes.aLookLift.array as Float32Array;
    expect([...lift]).toEqual([0, 0, 5, 0, 0, 6]);
  });

  it('de noche, el vidrio recibe la luz de las ventanas encendidas; de día, nada (D-19)', () => {
    const layer = fakeLayer();
    const real = createRealColors(layer, buildings, [look]);
    real.setEnabled(true);
    const material = (layer.mesh.material as THREE.Material[])[1];
    const glow = (material.userData.lookUniforms.lookNightGlow.value as THREE.Color);
    expect(glow.getHex()).toBe(0);
    real.setGlow(1);
    expect(glow.r).toBeGreaterThan(glow.b);
    expect(glow.r).toBeGreaterThan(0.3);
    expect(glow.r).toBeLessThan(0.8);
    const night = glow.r;
    real.setGlow(1.25);
    expect(glow.r).toBeCloseTo(night * 1.25);
    real.setGlow(0);
    expect(glow.getHex()).toBe(0);
  });

  it('una ficha de un edificio que no está en la escena detiene todo', () => {
    expect(() => createRealColors(fakeLayer(), [{ planKey: 'otro', g: square }], [look])).toThrow(/no está en el modelo/);
  });
});
