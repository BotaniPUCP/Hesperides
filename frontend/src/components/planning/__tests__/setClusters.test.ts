import type { SceneData } from '@/components/map3d/sceneData';
import { setClusters } from '../setClusters';

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

  it('lo que no está en el mapa no se agrupa', () => {
    expect(setClusters(scene(), ['NO-EXISTE'], ['TAMPOCO'])).toEqual([]);
  });
});
