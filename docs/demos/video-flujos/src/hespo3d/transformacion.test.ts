import { describe, expect, test } from 'vitest';
import type { EstadoHespo } from '../hespo/recorrido';
import { POSES_HESPO } from '../hespo/poses';
import { transformacion3D } from './transformacion';

const base: EstadoHespo = { x: 960, y: 880, mira: 1, caminando: false, pose: 'quieto', articulaciones: POSES_HESPO.quieto };
const rad = (g: number) => (g * Math.PI) / 180;

describe('transformacion3D', () => {
  test('los pies quedan en el mismo píxel que el Hespo 2D, con y hacia arriba', () => {
    const t = transformacion3D(base, 1);
    expect(t.x).toBe(960);
    expect(t.y).toBe(-880);
  });

  test('mirando a la izquierda gira media vuelta', () => {
    expect(transformacion3D(base, 1).giroY).toBe(0);
    expect(transformacion3D({ ...base, mira: -1 }, 1).giroY).toBeCloseTo(Math.PI);
  });

  test('mide lo mismo que el Hespo 2D: 304 px a escala 1 para un modelo de 2,9 unidades', () => {
    expect(transformacion3D(base, 1).escalaPx * 2.9).toBeCloseTo(304, 5);
    expect(transformacion3D(base, 0.6).escalaPx * 2.9).toBeCloseTo(304 * 0.6, 5);
  });

  test('un brazo arriba en 2D (grados negativos) sube en 3D (radianes positivos)', () => {
    const t = transformacion3D({ ...base, articulaciones: POSES_HESPO.saluda }, 1);
    expect(t.brazoD).toBeCloseTo(rad(100));
    expect(t.brazoI).toBeCloseTo(0);
  });

  test('el salto 2D sube a Hespo la misma cantidad de píxeles', () => {
    const t = transformacion3D({ ...base, articulaciones: POSES_HESPO.salta }, 1);
    expect(t.y).toBe(-880 + 30);
  });

  test('fuera de cuadro conserva la posición sin recortarla', () => {
    expect(transformacion3D({ ...base, x: -220 }, 1).x).toBe(-220);
  });
});
