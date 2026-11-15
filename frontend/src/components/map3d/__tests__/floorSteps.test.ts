import type { BuildingModelManifest, FloorSteps } from '@shared/types';
import { trianglesOf, type V } from '../__fixtures__/meshInspect';
import { repoManifest } from '../__fixtures__/repoFootprints';
import { floorStepsOf, withFloorSteps } from '../viewer/floorSteps';

/** Triángulos del modelo con sus vértices en [este, norte, cota], en el marco de la escena (y arriba, z al sur). */
const tris = (...vs: V[]) => new Float32Array(vs.flatMap(([east, north, z]) => [east, z, -north]));

function manifest(floorSteps: BuildingModelManifest['floorSteps']): BuildingModelManifest {
  return { version: 'v', anchor: { lat: -12.07, lon: -77.08 }, nodes: { suelo: 'suelo' }, sunken: [], huaca: { label: 'h', at: [-12.07, -77.08, 0] }, groundOnly: [], floorSteps };
}

// Una rampa de 4 m de ancho que baja 1 m en 10 m hacia el norte: cota 0 en el norte 0, −1 en el norte 10.
const ramp = tris([0, 0, 0], [4, 0, 0], [4, 10, -1], [0, 0, 0], [4, 10, -1], [0, 10, -1]);
const steps: FloorSteps = { polygon: [[0, 0], [4, 0], [4, 10], [0, 10]], fromM: -1, toM: 0, risers: 4, why: 'prueba' };
const rampOf = (positions: Float32Array) => ({ positions, uv: null });

const isFlat = (t: V[]) => t.every((v) => Math.abs(v[2] - t[0][2]) < 1e-6);
const isVertical = (t: V[]) => Math.abs((t[1][0] - t[0][0]) * (t[2][1] - t[0][1]) - (t[2][0] - t[0][0]) * (t[1][1] - t[0][1])) < 1e-9;
const planArea = (ts: V[][]) => ts.reduce((s, t) => s + Math.abs((t[1][0] - t[0][0]) * (t[2][1] - t[0][1]) - (t[2][0] - t[0][0]) * (t[1][1] - t[0][1])) / 2, 0);

describe('floorStepsOf', () => {
  it('sin escalones no hay nada que escalonar', () => {
    expect(floorStepsOf(manifest(undefined)).size).toBe(0);
  });

  it('devuelve los escalones de cada rampa con su nombre', () => {
    expect(floorStepsOf(manifest({ a: steps })).get('a')).toBe(steps);
  });

  it('falla con contrahuellas que no son un entero de dos o más', () => {
    expect(() => floorStepsOf(manifest({ a: { ...steps, risers: 1 } }))).toThrow(/a.*contrahuellas/);
    expect(() => floorStepsOf(manifest({ a: { ...steps, risers: 2.5 } }))).toThrow(/contrahuellas/);
  });

  it('falla si la rampa no baja de una cota a otra más alta', () => {
    expect(() => floorStepsOf(manifest({ a: { ...steps, fromM: 0, toM: 0 } }))).toThrow(/a.*sube/);
  });

  it('falla con un polígono de menos de tres puntos o con un punto que no son dos números finitos', () => {
    expect(() => floorStepsOf(manifest({ a: { ...steps, polygon: [[0, 0], [1, 1]] } }))).toThrow(/polígono de los escalones a/);
    expect(() => floorStepsOf(manifest({ a: { ...steps, polygon: [[0, 0], [1, Number.NaN], [2, 0]] } }))).toThrow(/polígono de los escalones a/);
  });
});

describe('withFloorSteps', () => {
  const out = withFloorSteps(rampOf(ramp), new Map([['a', steps]]));
  const faces = trianglesOf(out.positions);

  it('no deja caras inclinadas: solo huellas horizontales y contrahuellas verticales', () => {
    expect(faces.filter((t) => !isFlat(t) && !isVertical(t))).toEqual([]);
  });

  it('las huellas cubren la planta de la rampa, cada una a la cota de su escalón', () => {
    const treads = faces.filter(isFlat);
    const levels = [...new Set(treads.map((t) => Math.abs(t[0][2]).toFixed(4)))].sort();

    expect(planArea(treads)).toBeCloseTo(40, 6);
    expect(levels).toEqual(['0.0000', '0.2500', '0.5000', '0.7500']);
  });

  it('nunca baja de la rampa: cada huella va a la cota de arriba de su franja', () => {
    // La rampa a la altura de un punto: z = −norte / 10.
    for (const t of faces.filter(isFlat)) for (const [, north, z] of t) expect(z).toBeGreaterThanOrEqual(-north / 10 - 1e-6);
  });

  it('lleva una contrahuella por escalón, de 0,25 m y a lo ancho de la rampa', () => {
    const risers = faces.filter((t) => isVertical(t) && !isFlat(t));
    const heights = risers.map((t) => Math.max(...t.map((v) => v[2])) - Math.min(...t.map((v) => v[2])));
    expect(heights.every((h) => Math.abs(h - 0.25) < 1e-6)).toBe(true);
    // Cuatro contrahuellas de 4 m × 0,25 m: el área vertical es 4 m².
    const verticalArea = risers.reduce((s, [a, b, c]) => {
      const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      return s + Math.hypot(u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]) / 2;
    }, 0);
    expect(verticalArea).toBeCloseTo(4, 6);
  });

  it('no pasa de sus cotas', () => {
    const zs = faces.flat().map((v) => v[2]);

    expect(Math.min(...zs)).toBeGreaterThanOrEqual(-1 - 1e-6);
    expect(Math.max(...zs)).toBeLessThanOrEqual(1e-6);
  });

  it('deja igual, en su orden, lo que no es rampa: lo plano, lo vertical y lo que cae fuera del polígono', () => {
    const others = tris([0, 0, 0], [4, 0, 0], [4, -5, 0], [0, 0, 0], [4, 0, 0], [4, 0, -3], [10, 0, 0], [14, 0, 0], [14, 10, -1]);
    const result = withFloorSteps(rampOf(new Float32Array([...others, ...ramp])), new Map([['a', steps]]));

    expect(Array.from(result.positions.slice(0, others.length))).toEqual(Array.from(others));
  });

  it('toma un triángulo de la rampa que se sale un poco del polígono: cuenta dónde cae su centro', () => {
    const wide = tris([-1, 0, 0], [4, 0, 0], [4, 10, -1]);

    expect(trianglesOf(withFloorSteps(rampOf(wide), new Map([['a', steps]])).positions).every((t) => isFlat(t) || isVertical(t))).toBe(true);
  });

  it('deja una rampa que pasa de las cotas: un murete que sube sobre la plaza no se escalona', () => {
    const wall = tris([0, 0, 0], [4, 0, 0.5], [4, 10, -1]);

    expect(() => withFloorSteps(rampOf(wall), new Map([['a', steps]]))).toThrow(/escalones a no toman nada/);
  });

  it('falla si una rampa del manifiesto no toma nada del piso: el manifiesto no calza con el modelo', () => {
    expect(() => withFloorSteps(rampOf(ramp), new Map([['b', { ...steps, polygon: [[50, 50], [51, 50], [51, 51]] }]]))).toThrow(/escalones b no toman nada/);
  });

  it('las coordenadas de textura van en metros: desde arriba en las huellas y de frente en las contrahuellas', () => {
    const uv = withFloorSteps({ positions: ramp, uv: new Float32Array((ramp.length / 3) * 2) }, new Map([['a', steps]])).uv!;
    const ts = trianglesOf(out.positions);
    for (let t = 0; t < ts.length; t++) {
      for (let k = 0; k < 3; k++) {
        const [east, north, z] = ts[t][k];
        const [u, v] = [uv[(t * 3 + k) * 2], uv[(t * 3 + k) * 2 + 1]];
        // Las contrahuellas miran al norte o al sur: (este, cota). Las huellas, desde arriba: (este, norte).
        expect([u, v]).toEqual(isFlat(ts[t]) ? [expect.closeTo(east, 6), expect.closeTo(north, 6)] : [expect.closeTo(east, 6), expect.closeTo(z, 6)]);
      }
    }
  });
});

describe('los escalones del manifiesto del repositorio', () => {
  it('las rampas frente al CIA: la pegada al césped de peldaños separados y las otras dos normales', () => {
    const steps = floorStepsOf(repoManifest());

    expect([...steps].map(([key, s]) => [key, s.fromM, s.toM, s.risers])).toEqual([
      ['cia-a', -4.8, 0.2, 14], ['cia-b', -4.8, 0.2, 28], ['cia-c', -4.8, 0.2, 28]]);
    expect([...steps.values()].every((s) => s.why.length > 0)).toBe(true);
  });
});
