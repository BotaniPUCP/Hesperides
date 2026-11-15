import { FINISH_LIGHT, finishId, finishOf } from '../finishes';
import { finishGrain } from '../finishGrain';
import { FINISHES } from '../types';

const SHARP: [number, number] = [0.0005, 0.0005];
const FAR: [number, number] = [5, 5];
const SEED = 17;
const id = (name: string) => finishId(finishOf(name, { color: '#ffffff' }));

describe('finishOf: el acabado sale del nombre del material (SPEC-112 D-17)', () => {
  it.each([
    ['ladrillo', 'brick'], ['ladrillo-oscuro', 'brick'],
    ['concreto', 'concrete'], ['losas', 'concrete'], ['zocalo', 'concrete'], ['testero', 'concrete'], ['base', 'concrete'], ['bloque', 'concrete'],
    ['metal', 'metal'], ['oxido', 'metal'], ['remate', 'metal'],
    ['ventanas', 'glazed'], ['vidrio-alto', 'glazed'], ['vanos', 'glazed'], ['translucido', 'glazed'], ['vitrina', 'glazed'], ['cintas', 'glazed'],
    ['techo', 'smooth'], ['sombra', 'smooth'],
    ['muro', 'plaster'], ['melon', 'plaster'], ['', 'plaster'],
  ])('%s → %s', (name, finish) => {
    expect(finishOf(name, { color: '#ffffff' })).toBe(finish);
  });

  it('un finish en el material reemplaza al del nombre', () => {
    expect(finishOf('muro', { color: '#ffffff', finish: 'brick' })).toBe('brick');
    expect(finishOf('ladrillo', { color: '#ffffff', finish: 'smooth' })).toBe('smooth');
  });

  it('no distingue mayúsculas ni tildes', () => {
    expect(finishOf('Zócalo', { color: '#ffffff' })).toBe('concrete');
    expect(finishOf('Ladrillo', { color: '#ffffff' })).toBe('brick');
  });

  it('cada acabado tiene su rugosidad y su metal (D-18)', () => {
    expect(FINISH_LIGHT.smooth).toEqual({ rough: 0.88, metal: 0 });
    expect(FINISH_LIGHT.brick.rough).toBe(0.92);
    expect(FINISH_LIGHT.metal).toEqual({ rough: 0.45, metal: 0.3 });
    expect(FINISH_LIGHT.glazed).toEqual({ rough: 0.3, metal: 0.05 });
    FINISHES.forEach((f) => expect(FINISH_LIGHT[f]).toBeDefined());
  });
});

/** El promedio del grano sobre un paño grande, muestreado de cerca. */
function meanShade(finish: number, w: number, h: number, step: number) {
  let sum = 0, n = 0;
  for (let u = 0.0013; u < w; u += step) for (let v = 0.0007; v < h; v += step) { sum += finishGrain(finish, u, v, SHARP, SEED).shade; n++; }
  return sum / n;
}

describe('finishGrain: ladrillo', () => {
  const brick = id('ladrillo');

  it('la junta entre hiladas es más oscura y está hundida', () => {
    const joint = finishGrain(brick, 0.1, 0.075, SHARP, SEED);
    const face = finishGrain(brick, 0.1, 0.0375, SHARP, SEED);
    expect(joint.shade).toBeLessThan(face.shade * 0.9);
    expect(joint.height).toBeLessThan(face.height);
    expect(face.height).toBeCloseTo(0, 5);
  });

  it('va a soga: la junta vertical se corre medio ladrillo en la hilada de arriba', () => {
    const lower = finishGrain(brick, 0.25, 0.0375, SHARP, SEED);
    const upper = finishGrain(brick, 0.25, 0.1125, SHARP, SEED);
    expect(lower.height).toBeLessThan(0);
    expect(upper.height).toBeCloseTo(0, 5);
  });

  it('el promedio del grano sobre la cara es 1 (±1 %)', () => {
    expect(meanShade(brick, 5, 3, 0.0031)).toBeCloseTo(1, 1);
    expect(Math.abs(meanShade(brick, 5, 3, 0.0031) - 1)).toBeLessThan(0.01);
  });

  it('de lejos se funde: shade = 1 y sin relieve', () => {
    const far = finishGrain(brick, 0.25, 0.075, FAR, SEED);
    expect(far.shade).toBeCloseTo(1, 5);
    expect(far.height).toBeCloseTo(0, 5);
  });
});

describe('finishGrain: concreto, metal y tarrajeo', () => {
  it('concreto: junta de encofrado cada 2,4 × 1,2 m; promedio 1', () => {
    const concrete = id('concreto');
    expect(finishGrain(concrete, 2.4, 0.6, SHARP, SEED).height).toBeLessThan(0);
    expect(finishGrain(concrete, 1.2, 1.2, SHARP, SEED).height).toBeLessThan(0);
    expect(finishGrain(concrete, 1.2, 0.6, SHARP, SEED).height).toBeCloseTo(0, 5);
    expect(Math.abs(meanShade(concrete, 24, 12, 0.0137) - 1)).toBeLessThan(0.01);
    expect(finishGrain(concrete, 2.4, 1.2, FAR, SEED).shade).toBeCloseTo(1, 5);
  });

  it('metal: engrape en relieve cada 60 cm', () => {
    const metal = id('metal');
    expect(finishGrain(metal, 0.6, 1, SHARP, SEED).height).toBeGreaterThan(0);
    expect(finishGrain(metal, 0.3, 1, SHARP, SEED).height).toBeCloseTo(0, 5);
    expect(finishGrain(metal, 0.6, 1, FAR, SEED).height).toBeCloseTo(0, 5);
  });

  it('tarrajeo: manchas suaves (±3,5 %), sin relieve, promedio 1', () => {
    const plaster = id('muro');
    const values: number[] = [];
    for (let u = 0; u < 40; u += 0.37) values.push(finishGrain(plaster, u, 3.1, SHARP, SEED).shade);
    expect(Math.max(...values)).toBeLessThanOrEqual(1.035 + 1e-9);
    expect(Math.min(...values)).toBeGreaterThanOrEqual(0.965 - 1e-9);
    expect(Math.max(...values) - Math.min(...values)).toBeGreaterThan(0.01);
    expect(finishGrain(plaster, 3, 3, SHARP, SEED).height).toBe(0);
    expect(Math.abs(meanShade(plaster, 64, 64, 0.29) - 1)).toBeLessThan(0.01);
  });

  it('liso y acristalado no llevan grano', () => {
    [id('techo'), id('ventanas')].forEach((f) => expect(finishGrain(f, 1.234, 2.5, SHARP, SEED)).toEqual({ shade: 1, height: 0 }));
  });

  it('un techo (semilla negativa) no lleva grano aunque su material sea ladrillo', () => {
    expect(finishGrain(id('ladrillo'), 0.1, 0.075, SHARP, -1)).toEqual({ shade: 1, height: 0 });
  });

  it('el grano sale siempre igual para la misma cara', () => {
    expect(finishGrain(id('ladrillo'), 1.13, 0.4, SHARP, SEED)).toEqual(finishGrain(id('ladrillo'), 1.13, 0.4, SHARP, SEED));
  });
});
