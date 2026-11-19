import type { Polygon } from '../sceneData';
import { floorWithoutLawns, lawnsOverSunken } from '../viewer/floorWithoutLawns';

type V = [number, number, number];

/** Triángulos del modelo con sus vértices en [este, norte, cota], en el marco de la escena (y arriba, z al sur). */
const tris = (...vs: V[]) => new Float32Array(vs.flatMap(([east, north, z]) => [east, z, -north]));
/** Un rectángulo del plano como polígono de la escena (anillo plano este, norte). */
const rect = (x0: number, y0: number, x1: number, y1: number): Polygon => [[x0, y0, x1, y0, x1, y1, x0, y1]];
const NONE = { x: 0, z: 0 };

/** Área en planta de los triángulos. */
function planArea(p: Float32Array): number {
  let s = 0;
  for (let i = 0; i < p.length; i += 9) {
    s += Math.abs((p[i + 3] - p[i]) * (p[i + 8] - p[i + 2]) - (p[i + 6] - p[i]) * (p[i + 5] - p[i + 2])) / 2;
  }
  return s;
}

/** Un punto del plano está cubierto si cae dentro de algún triángulo de salida (no en su borde). */
function covers(p: Float32Array, east: number, north: number): boolean {
  const x = east, z = -north;
  for (let i = 0; i < p.length; i += 9) {
    const d = (ax: number, az: number, bx: number, bz: number) => (bx - ax) * (z - az) - (bz - az) * (x - ax);
    const s = [d(p[i], p[i + 2], p[i + 3], p[i + 5]), d(p[i + 3], p[i + 5], p[i + 6], p[i + 8]), d(p[i + 6], p[i + 8], p[i], p[i + 2])];
    if (s.every((v) => v > 1e-9) || s.every((v) => v < -1e-9)) return true;
  }
  return false;
}

describe('floorWithoutLawns', () => {
  // Un piso de 10 × 10 m en dos triángulos, a 0,25 m bajo el suelo.
  const positions = tris([0, 0, -0.25], [10, 0, -0.25], [10, 10, -0.25], [0, 0, -0.25], [10, 10, -0.25], [0, 10, -0.25]);
  const floor = { positions, uv: null };

  it('quita la parte del piso que cae en el césped: debajo se ve el jardín', () => {
    const out = floorWithoutLawns(floor, [[rect(2, 2, 6, 5)]], NONE).positions;

    expect(planArea(out)).toBeCloseTo(88, 6);
    expect(covers(out, 4, 3.5)).toBe(false);
    expect(covers(out, 8, 7)).toBe(true);
  });

  it('lo que queda del piso sigue a su cota', () => {
    const out = floorWithoutLawns(floor, [[rect(2, 2, 6, 5)]], NONE).positions;

    for (let i = 1; i < out.length; i += 3) expect(out[i]).toBeCloseTo(-0.25, 6);
  });

  it('un césped que pasa el borde del piso solo quita lo que hay', () => {
    expect(planArea(floorWithoutLawns(floor, [[rect(8, 8, 14, 14)]], NONE).positions)).toBeCloseTo(96, 6);
  });

  it('sin césped encima, el piso queda igual, triángulo por triángulo', () => {
    expect(floorWithoutLawns(floor, [[rect(20, 20, 30, 30)]], NONE).positions).toEqual(positions);
  });

  it('el hueco de un césped conserva su piso', () => {
    const withHole: Polygon = [...rect(0, 0, 10, 10), [4, 4, 4, 6, 6, 6, 6, 4]];
    const out = floorWithoutLawns(floor, [[withHole]], NONE).positions;

    expect(planArea(out)).toBeCloseTo(4, 6);
    expect(covers(out, 5, 5.5)).toBe(true);
  });

  it('un césped cóncavo (en L) quita solo su forma', () => {
    const ell: Polygon = [[0, 0, 10, 0, 10, 2, 2, 2, 2, 10, 0, 10]];
    const out = floorWithoutLawns(floor, [[ell]], NONE).positions;

    expect(planArea(out)).toBeCloseTo(64, 6);
    expect(covers(out, 6, 7)).toBe(true);
    expect(covers(out, 1, 6)).toBe(false);
  });

  it('en una rampa, lo que queda sigue su pendiente y sus coordenadas de textura', () => {
    const ramp = { positions: tris([0, 0, 0], [10, 0, -5], [0, 10, 0]), uv: new Float32Array([0, 0, 10, 0, 0, 10]) };
    const out = floorWithoutLawns(ramp, [[rect(0, 0, 4, 4)]], NONE);

    for (let i = 0, k = 0; i < out.positions.length; i += 3, k += 2) {
      expect(out.positions[i + 1]).toBeCloseTo(-out.positions[i] / 2, 6);
      expect(out.uv![k]).toBeCloseTo(out.positions[i], 6);
      expect(out.uv![k + 1]).toBeCloseTo(-out.positions[i + 2], 6);
    }
  });

  it('los muros del piso no tienen planta y se quedan', () => {
    const wall = tris([0, 5, 0], [10, 5, 0], [10, 5, -3]);

    expect(floorWithoutLawns({ positions: wall, uv: null }, [[rect(0, 0, 10, 10)]], NONE).positions).toEqual(wall);
  });

  it('las caras que quedan miran hacia el mismo lado que su triángulo', () => {
    const out = floorWithoutLawns(floor, [[rect(2, 2, 6, 5)]], NONE).positions;
    const normalY = (i: number) => (out[i + 5] - out[i + 2]) * (out[i + 6] - out[i]) - (out[i + 3] - out[i]) * (out[i + 8] - out[i + 2]);
    const reference = (positions[5] - positions[2]) * (positions[6] - positions[0]) - (positions[3] - positions[0]) * (positions[8] - positions[2]);

    for (let i = 0; i < out.length; i += 9) expect(Math.sign(normalY(i))).toBe(Math.sign(reference));
  });

  it('el piso está en el marco del modelo: el césped se corre por el anclaje', () => {
    // El modelo está 100 m al este y 50 m al norte (z = -50) del origen de la escena.
    const out = floorWithoutLawns(floor, [[rect(102, 52, 106, 55)]], { x: 100, z: -50 }).positions;

    expect(planArea(out)).toBeCloseTo(88, 6);
    expect(covers(out, 4, 3.5)).toBe(false);
  });
});

describe('lawnsOverSunken', () => {
  const sunken = [rect(0, 0, 10, 10)];
  const near = [rect(8, 8, 20, 20)];
  const far = [rect(50, 50, 60, 60)];

  it('solo los céspedes que tocan un desnivel: fuera de ellos el piso queda bajo el suelo del mapa', () => {
    expect(lawnsOverSunken([near, far], [sunken])).toEqual([near]);
  });

  it('sin desniveles no hay nada que quitar', () => {
    expect(lawnsOverSunken([near], [])).toEqual([]);
  });
});
