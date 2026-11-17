import { describe, expect, it } from 'vitest';
import { enDos } from './enDos';

describe('enDos', () => {
  it('repite cada cuadro par en el impar siguiente (animación «en dos»)', () => {
    expect([0, 1, 2, 3, 4, 5].map(enDos)).toEqual([0, 0, 2, 2, 4, 4]);
  });
  it('respeta los cuadros negativos (antes del inicio de un tramo)', () => {
    expect(enDos(-1)).toBe(-2);
  });
});
