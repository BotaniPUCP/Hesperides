import { flatRoofTop, roofItems, ROOFS } from '../roofDetails';

/** Una caja de lado `s` y alto `h` como vértices sueltos: 8 esquinas, cuatro arriba repetidas para llegar al mínimo. */
const boxVertices = (s: number, h: number) => {
  const v: number[] = [];
  for (const y of [0, h, h]) for (const [x, z] of [[0, 0], [s, 0], [s, s], [0, s]]) v.push(x, y, z);
  return v;
};

describe('equipos de techo del Atardecer', () => {
  it('un techo plano da su cota; uno inclinado (un solo vértice arriba), ninguna', () => {
    expect(flatRoofTop(boxVertices(20, 12), 0, 12)).toBe(12);
    const ridge = [0, 0, 0, 10, 0, 0, 10, 0, 10, 0, 0, 10, 5, 6, 5];
    expect(flatRoofTop(ridge, 0, 5)).toBeNull();
  });

  it('reparte equipos según el área, todos dentro de la huella y con margen al borde', () => {
    const ring = [0, 0, 40, 0, 40, 30, 0, 30];
    const items = roofItems([[[ring]]], [15]);
    expect(items.length).toBe(Math.round((40 * 30) / ROOFS.m2PerItem));
    for (const it of items) {
      expect(it.z).toBe(15);
      const r = Math.max(it.w, it.d) / 2;
      expect(it.x - r).toBeGreaterThan(0);
      expect(it.x + r).toBeLessThan(40);
      expect(it.y - r).toBeGreaterThan(0);
      expect(it.y + r).toBeLessThan(30);
    }
  });

  it('un edificio sin techo plano no lleva nada', () => {
    expect(roofItems([[[[0, 0, 40, 0, 40, 30, 0, 30]]]], [null])).toEqual([]);
  });
});
