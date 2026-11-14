import { facadeColor } from '../facadeColor';
import { buildLookTable } from '../lookTable';
import type { BuildingLook, Material, Side, Zone } from '../types';

const SHARP: [number, number] = [0.001, 0.001];
const FAR: [number, number] = [5, 5];
const WHITE = [1, 1, 1], RED = [1, 0, 0], BLUE = [0, 0, 1], BLACK = [0, 0, 0], GRAY = [0.5, 0.5, 0.5];

const materials: Record<string, Material> = {
  blanco: { color: '#ffffff' }, rojo: { color: '#ff0000' }, azul: { color: '#0000ff' }, gris: { color: '#808080' },
  vidrio: { glass: '#000000', frame: '#ffffff', moduleM: 2, heightM: 4, frameM: 0.1 },
};

function sampler(zone: Partial<Zone>, extra: Record<string, Material> = {}) {
  const look: BuildingLook = {
    planKey: 'k1', name: 'Uno', folder: 'uno', photos: ['frente.jpg'], materials: { ...materials, ...extra },
    zones: [{ id: 'base', wall: 'blanco', roof: 'gris', ...zone }],
  };
  const table = buildLookTable([look]);
  const rows = table.zones.get('k1')![0];
  return {
    at: (side: Side, u: number, v: number, aa = SHARP) => facadeColor(table, rows.sides[side], u, v, aa),
    roof: (u: number, v: number) => facadeColor(table, rows.roof, u, v, SHARP),
  };
}

const expectRgb = (actual: readonly number[], expected: readonly number[], digits = 3) =>
  expected.forEach((c, i) => expect(actual[i]).toBeCloseTo(c, digits));

describe('facadeColor: regiones', () => {
  it('fuera de toda región, el muro', () => {
    const s = sampler({ faces: { N: [{ material: 'rojo', u: [0, 5] }] } });
    expectRgb(s.at('N', -3, 2).rgb, WHITE);
    expectRgb(s.at('N', 3, 2).rgb, RED);
  });

  it('dentro de dos regiones, la última', () => {
    const s = sampler({ faces: { N: [{ material: 'rojo', u: [0, 10] }, { material: 'azul', u: [5, 15] }] } });
    expectRgb(s.at('N', 3, 2).rgb, RED);
    expectRgb(s.at('N', 7, 2).rgb, BLUE);
  });

  it('sin tramo de u ocupa todo el ancho, y sin tramo de v toda la altura', () => {
    const s = sampler({ faces: { N: [{ material: 'rojo', v: [2, 3] }, { material: 'azul', u: [40, 41] }] } });
    expectRgb(s.at('N', -100, 2.5).rgb, RED);
    expectRgb(s.at('N', 100, 2.5).rgb, RED);
    expectRgb(s.at('N', 0, 1).rgb, WHITE);
    expectRgb(s.at('N', 40.5, -50).rgb, BLUE);
    expectRgb(s.at('N', 40.5, 80).rgb, BLUE);
  });

  it('una franja por piso pinta el tramo de cada piso y no lo que hay entre pisos', () => {
    const s = sampler({ common: [{ material: 'rojo', floors: { everyM: 4, bandM: [0, 0.5] } }] });
    [0.25, 4.25, 8.25, -3.75].forEach((v) => expectRgb(s.at('N', 0, v).rgb, RED));
    [2, 6, 10.4].forEach((v) => expectRgb(s.at('N', 0, v).rgb, WHITE));
  });

  it('una franja por piso arranca en la línea del primer piso que dice la ficha', () => {
    const s = sampler({ common: [{ material: 'rojo', floors: { everyM: 4, startM: 1, bandM: [-0.2, 0.2] } }] });
    expectRgb(s.at('N', 0, 5).rgb, RED);
    expectRgb(s.at('N', 0, 4).rgb, WHITE);
  });

  it('una orientación sin entrada lleva el muro y las regiones comunes, sin vidrio', () => {
    const s = sampler({ common: [{ material: 'rojo', v: [-1, 0.5] }], faces: { N: [{ material: 'vidrio', u: [-10, 10], v: [1, 9] }] } });
    expect(s.at('N', 1, 2).glass).toBeGreaterThan(0.5);
    const unseen = s.at('S', 1, 2);
    expectRgb(unseen.rgb, WHITE);
    expect(unseen.glass).toBe(0);
    expectRgb(s.at('S', 1, 0).rgb, RED);
  });

  it('una copia en espejo pone el mismo tramo del edificio en la misma región', () => {
    const s = sampler({ faces: { N: [{ material: 'rojo', u: [2, 6] }], S: { sameAs: 'N', mirror: true, why: 'barra gemela' } } });
    expectRgb(s.at('S', -4, 2).rgb, RED);
    expectRgb(s.at('S', 4, 2).rgb, WHITE);
  });

  it('los techos llevan el material de techo de su zona', () => {
    expectRgb(sampler({}).roof(12, 30).rgb, GRAY, 2);
  });

  it('el borde de una región se suaviza con el tamaño del píxel', () => {
    const s = sampler({ faces: { N: [{ material: 'rojo', u: [0, 10] }] } });
    expectRgb(s.at('N', 0, 2, [0.1, 0.1]).rgb, [1, 0.5, 0.5], 2);
  });
});

describe('facadeColor: vidrio', () => {
  const s = sampler({ faces: { N: [{ material: 'vidrio', u: [0, 10], v: [0, 8] }] } });

  it('el paño lleva el color del vidrio y el borde del módulo, el del perfil', () => {
    const pane = s.at('N', 1, 2);
    expectRgb(pane.rgb, BLACK);
    expect(pane.glass).toBeCloseTo(1, 2);
    expectRgb(s.at('N', 2, 2).rgb, WHITE);
    expect(s.at('N', 2, 2).glass).toBeCloseTo(0, 2);
    expectRgb(s.at('N', 1, 4).rgb, WHITE);
  });

  it('la retícula arranca en el borde de su región', () => {
    const t = sampler({ faces: { N: [{ material: 'vidrio', u: [0.5, 10], v: [1, 9] }] } });
    expectRgb(t.at('N', 2.5, 2).rgb, WHITE);
    expectRgb(t.at('N', 3.5, 3).rgb, BLACK);
    expectRgb(t.at('N', 3.5, 5).rgb, WHITE);
  });

  it('con antepecho: abajo el antepecho, arriba el paño', () => {
    const t = sampler({ faces: { N: [{ material: 'muro', u: [0, 10], v: [0, 8] }] } }, {
      muro: { glass: '#000000', frame: '#ffffff', moduleM: 2, heightM: 4, frameM: 0.1, spandrel: { color: '#ff0000', heightM: 1 } },
    });
    expectRgb(t.at('N', 1, 0.5).rgb, RED);
    expectRgb(t.at('N', 1, 2.5).rgb, BLACK);
  });

  it('lejos, la retícula se funde en su color promedio y no se ven los perfiles', () => {
    const full = sampler({ faces: { N: [{ material: 'vidrio' }] } });
    const average = [0.075, 0.075, 0.075];
    expectRgb(full.at('N', 1, 2, FAR).rgb, average, 2);
    expectRgb(full.at('N', 2, 4, FAR).rgb, average, 2);
  });

  it('lejos, una franja por piso se funde según la proporción del piso que ocupa', () => {
    const t = sampler({ common: [{ material: 'rojo', floors: { everyM: 4, bandM: [0, 0.5] } }] });
    expectRgb(t.at('N', 0, 2, FAR).rgb, [1, 0.875, 0.875], 2);
  });
});

describe('facadeColor: acentos', () => {
  const accented = {
    muro: { glass: '#000000', frame: '#ffffff', moduleM: 1, heightM: 2, frameM: 0.05, spandrel: { color: '#ff0000', heightM: 1 }, accent: { color: '#0000ff', share: 0.25 } },
  };
  const cells = (side: Side, t: ReturnType<typeof sampler>) => {
    const blue: boolean[] = [];
    for (let i = 0; i < 100; i++) for (let j = 0; j < 100; j++) blue.push(t.at(side, i + 0.5, j * 2 + 0.5).rgb[2] > 0.5);
    return blue;
  };
  const t = sampler({ wall: 'muro', faces: { N: [{ material: 'muro' }], S: [{ material: 'muro' }] } }, accented);

  it('salen en la proporción pedida (±5 % en 10 000 módulos)', () => {
    const share = cells('N', t).filter(Boolean).length / 10000;
    expect(share).toBeGreaterThan(0.25 * 0.95);
    expect(share).toBeLessThan(0.25 * 1.05);
  });

  it('salen siempre iguales para la misma ficha', () => {
    const again = sampler({ wall: 'muro', faces: { N: [{ material: 'muro' }], S: [{ material: 'muro' }] } }, accented);
    expect(cells('N', again)).toEqual(cells('N', t));
  });

  it('dos caras no repiten el mismo reparto', () => {
    const n = cells('N', t), s = cells('S', t);
    expect(n.filter((blue, i) => blue === s[i]).length).toBeLessThan(9000);
  });
});
