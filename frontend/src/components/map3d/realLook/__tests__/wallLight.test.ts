import { wallLight } from '../wallLight';

/** Tonos de `geometry.ts → shading`: muro de 0,58 (pie) a 0,86 (arriba), techo desde 1,12. */
const WALL_FOOT = 0.58, WALL_TOP = 0.86, ROOF = 1.12;

describe('wallLight: volumen y contacto (SPEC-112 D-16 y D-20)', () => {
  it('el pie del muro es más oscuro que la parte alta, entre 0,92 y 1,08', () => {
    const foot = wallLight(WALL_FOOT, 5), top = wallLight(WALL_TOP, 5);
    expect(foot).toBeLessThan(top);
    expect(foot).toBeCloseTo(0.922, 2);
    expect(top).toBeCloseTo(1.078, 2);
  });

  it('el techo da 1', () => {
    expect(wallLight(ROOF, 0)).toBe(1);
    expect(wallLight(1.22, 30)).toBe(1);
  });

  it('el contacto oscurece hasta un 14 % en el pie y desaparece a los 0,9 m', () => {
    const mid = 0.72;
    expect(wallLight(mid, 0)).toBeCloseTo(0.86, 3);
    expect(wallLight(mid, 0.45)).toBeGreaterThan(0.86);
    expect(wallLight(mid, 0.9)).toBeCloseTo(1, 5);
    expect(wallLight(mid, 12)).toBeCloseTo(1, 5);
  });

  it('una cota bajo la base (vértice hundido) no oscurece más que el pie', () => {
    expect(wallLight(0.72, -2)).toBeCloseTo(wallLight(0.72, 0), 6);
  });
});
