import type { SceneData } from '@/components/map3d/sceneData';
import { MAX_GROUP_SPAN_M, setClusters } from '../setClusters';

/** Un cuadrado de lado 10 m con esquina en (x, y). */
const square = (code: string, x: number, y: number) => ({
  g: [[[x, y, x + 10, y, x + 10, y + 10, x, y + 10]]], props: { code },
});
const plant = (code: string, x: number, y: number) => ({ p: [x, y], props: { code } });

function scene(): SceneData {
  return {
    greenAreas: [square('A', 0, 0), square('B', 30, 0), square('C', 1000, 0)],
    xerophytic: [square('D', 2000, 2000)],
    reserve: [],
    vegetation: [plant('P1', 1005, 5), plant('P2', 5000, 5000)],
  } as unknown as SceneData;
}

describe('setClusters', () => {
  it('junta lo cercano y separa lo lejano, del grupo más grande al más chico', () => {
    const groups = setClusters(scene(), ['A', 'B', 'C', 'D'], ['P1', 'P2']);

    expect(groups).toEqual([
      { zoneCodes: ['A', 'B'], specimenCodes: [] },
      { zoneCodes: ['C'], specimenCodes: ['P1'] },
      { zoneCodes: ['D'], specimenCodes: [] },
      { zoneCodes: [], specimenCodes: ['P2'] },
    ]);
  });

  it('la cercanía es borde a borde: jardines contiguos quedan juntos aunque sus centros estén lejos', () => {
    const big = { g: [[[0, 0, 200, 0, 200, 200, 0, 200]]], props: { code: 'Grande' } };
    const data = { ...scene(), greenAreas: [big, square('Pegado', 205, 0)] } as unknown as SceneData;

    expect(setClusters(data, ['Grande', 'Pegado'], [])).toHaveLength(1);
  });

  it('una fila de jardines encadenada de punta a punta se parte en bloques que se pueden encuadrar', () => {
    // 20 jardines de 10 m, uno cada 40 m: cada uno está cerca del siguiente, pero la fila mide 770 m.
    const row = Array.from({ length: 20 }, (_, i) => square(`F-${i}`, i * 40, 0));
    const data = { ...scene(), greenAreas: row } as unknown as SceneData;

    const groups = setClusters(data, row.map((g) => g.props.code), []);

    expect(groups.length).toBeGreaterThan(1);
    expect(groups.flatMap((g) => g.zoneCodes).sort()).toEqual(row.map((g) => g.props.code).sort());
    for (const g of groups) {
      const xs = g.zoneCodes.map((code) => Number(code.slice(2)) * 40);
      expect(Math.max(...xs) + 10 - Math.min(...xs)).toBeLessThanOrEqual(MAX_GROUP_SPAN_M + 10);
    }
  });

  it('un grupo que cabe en un encuadre no se parte', () => {
    const near = [square('A', 0, 0), square('B', 50, 0), square('C', 100, 0)];
    const data = { ...scene(), greenAreas: near } as unknown as SceneData;

    expect(setClusters(data, ['A', 'B', 'C'], [])).toEqual([{ zoneCodes: ['A', 'B', 'C'], specimenCodes: [] }]);
  });

  it('lo que no está en el mapa no se agrupa', () => {
    expect(setClusters(scene(), ['NO-EXISTE'], ['TAMPOCO'])).toEqual([]);
  });
});
