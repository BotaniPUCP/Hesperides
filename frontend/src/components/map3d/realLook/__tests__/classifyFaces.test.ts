import { classifyBuilding, sideOf, type FaceAttributes } from '../classifyFaces';
import type { ZoneRows } from '../lookTable';
import type { Side } from '../types';

const sides = (base: number): Record<Side, number> => ({ N: base, NE: base + 1, E: base + 2, SE: base + 3, S: base + 4, SW: base + 5, W: base + 6, NW: base + 7 });
const zone: ZoneRows = { roof: 100, sides: sides(0) };
/** Huella de 10 × 10 m en el plano local: x de 0 a 10, norte de 0 a 10. */
const square = [[[0, 0, 10, 0, 10, 10, 0, 10]]];

/** Un triángulo en coordenadas de la escena (x este, y arriba, z = −norte). */
const tri = (...p: number[]) => p;

function run(positions: number[], zones: ZoneRows[] = [zone], footprint = square): FaceAttributes {
  const n = positions.length / 3;
  const out: FaceAttributes = { row: new Float32Array(n).fill(-1), face: new Float32Array(n * 2) };
  classifyBuilding(new Float32Array(positions), 0, n, footprint, zones, out);
  return out;
}

describe('sideOf', () => {
  it('lleva una normal horizontal a su sector de 45°', () => {
    expect(sideOf(0, 1)).toBe('N');
    expect(sideOf(1, 0)).toBe('E');
    expect(sideOf(0, -1)).toBe('S');
    expect(sideOf(-1, 0)).toBe('W');
    expect(sideOf(0.7, 0.7)).toBe('NE');
    expect(sideOf(-0.7, -0.7)).toBe('SW');
  });

  it('no falla justo en el borde entre sectores', () => {
    const a = Math.PI / 8;
    expect(['N', 'NE']).toContain(sideOf(Math.sin(a), Math.cos(a)));
  });
});

describe('classifyBuilding', () => {
  it('una cara horizontal es techo, mire arriba o abajo', () => {
    const up = run(tri(0, 5, 0, 10, 5, 0, 0, 5, -10));
    const down = run(tri(0, 5, 0, 0, 5, -10, 10, 5, 0));
    expect([...up.row]).toEqual([100, 100, 100]);
    expect([...down.row]).toEqual([100, 100, 100]);
  });

  it('el muro norte con la normal hacia afuera es N', () => {
    // muro en norte = 10 (z = −10), normal hacia +norte (−z)
    const out = run(tri(0, 0, -10, 10, 0, -10, 0, 5, -10));
    expect(out.row[0]).toBe(0);
  });

  it('el muro norte con la normal invertida también es N: se corrige con la huella', () => {
    const out = run(tri(0, 0, -10, 0, 5, -10, 10, 0, -10));
    expect(out.row[0]).toBe(0);
  });

  it('un muro interior (adentro de la huella por los dos lados) conserva su normal', () => {
    const out = run(tri(5, 0, -2, 5, 5, -2, 5, 0, -8));
    expect(out.row[0]).toBe(sides(0).W);
  });

  it('las coordenadas de la cara son la distancia a lo largo del muro y la cota', () => {
    const out = run(tri(0, 0, -10, 10, 0, -10, 0, 5, -10));
    expect(Math.abs(out.face[2] - out.face[0])).toBeCloseTo(10);
    expect(out.face[5]).toBeCloseTo(5);
  });

  it('un triángulo cae en la zona cuyo selector lo contiene; si no, en la de por defecto', () => {
    const tall: ZoneRows = { where: { heightM: [6, 99] }, roof: 200, sides: sides(50) };
    const east: ZoneRows = { where: { east: [0.5, 1] }, roof: 300, sides: sides(70) };
    const positions = [
      ...tri(0, 0, -10, 10, 0, -10, 0, 5, -10), // norte, abajo: por defecto
      ...tri(0, 8, -10, 10, 8, -10, 0, 9, -10), // norte, alto: zona alta
      ...tri(9, 0, 0, 9, 3, -1, 9, 0, -2), // muro cerca del este: zona este
    ];
    const out = run(positions, [zone, tall, east]);
    expect(out.row[0]).toBe(0);
    expect(out.row[3]).toBe(50);
    expect(out.row[6]).toBeGreaterThanOrEqual(70);
  });

  it('solo escribe dentro del tramo del edificio', () => {
    const n = 6;
    const out: FaceAttributes = { row: new Float32Array(n).fill(-1), face: new Float32Array(n * 2) };
    const p = new Float32Array([...tri(0, 0, -10, 10, 0, -10, 0, 5, -10), ...tri(0, 0, -10, 10, 0, -10, 0, 5, -10)]);
    classifyBuilding(p, 3, 6, square, [zone], out);
    expect([...out.row.slice(0, 3)]).toEqual([-1, -1, -1]);
    expect(out.row[3]).toBe(0);
  });

  it('un tramo vacío no hace nada', () => {
    expect(() => run([])).not.toThrow();
  });
});
