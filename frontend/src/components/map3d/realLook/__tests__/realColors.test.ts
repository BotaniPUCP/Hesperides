import * as THREE from 'three';
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
  zones: [{ id: 'base', roof: '#cccccc', faces: { other: { kind: 'blind', wall: '#ffffff' } } }],
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

  it('una ficha de un edificio que no está en la escena detiene todo', () => {
    expect(() => createRealColors(fakeLayer(), [{ planKey: 'otro', g: square }], [look])).toThrow(/no está en el modelo/);
  });
});
