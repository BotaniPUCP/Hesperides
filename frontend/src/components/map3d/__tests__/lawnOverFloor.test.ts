import type { Polygon } from '../sceneData';
import { LAWN_LIFT_M, lawnOverFloor, lawnsOverSunken } from '../viewer/lawnOverFloor';

type V = [number, number, number];

/** Un triángulo del modelo con sus vértices en [este, norte, cota], en el marco de la escena (y arriba, z al sur). */
const tri = (...vs: V[]) => vs.flatMap(([east, north, z]) => [east, z, -north]);
/** Un rectángulo del plano como polígono de la escena (anillo plano este, norte). */
const rect = (x0: number, y0: number, x1: number, y1: number): Polygon => [[x0, y0, x1, y0, x1, y1, x0, y1]];
const NONE = { x: 0, z: 0 };

/** Área en planta de los triángulos de salida. */
function planArea(p: Float32Array): number {
  let s = 0;
  for (let i = 0; i < p.length; i += 9) {
    s += Math.abs((p[i + 3] - p[i]) * (p[i + 8] - p[i + 2]) - (p[i + 6] - p[i]) * (p[i + 5] - p[i + 2])) / 2;
  }
  return s;
}

const heights = (p: Float32Array) => Array.from(p).filter((_, i) => i % 3 === 1);

describe('lawnOverFloor', () => {
  // Un piso de 10 × 10 m en dos triángulos, a 0,25 m bajo el suelo.
  const floor = new Float32Array([...tri([0, 0, -0.25], [10, 0, -0.25], [10, 10, -0.25]), ...tri([0, 0, -0.25], [10, 10, -0.25], [0, 10, -0.25])]);

  it('cubre la parte del piso que cae en el césped, apenas encima', () => {
    const out = lawnOverFloor(floor, [[rect(2, 2, 6, 5)]], NONE);

    expect(planArea(out)).toBeCloseTo(12, 6);
    heights(out).forEach((y) => expect(y).toBeCloseTo(-0.25 + LAWN_LIFT_M, 6));
  });

  it('un césped que pasa el borde del piso solo cubre el piso', () => {
    expect(planArea(lawnOverFloor(floor, [[rect(8, 8, 14, 14)]], NONE))).toBeCloseTo(4, 6);
  });

  it('sin césped encima, el piso queda como está', () => {
    expect(lawnOverFloor(floor, [[rect(20, 20, 30, 30)]], NONE)).toHaveLength(0);
  });

  it('respeta los huecos del césped', () => {
    const withHole: Polygon = [...rect(0, 0, 10, 10), [4, 4, 4, 6, 6, 6, 6, 4]];

    expect(planArea(lawnOverFloor(floor, [[withHole]], NONE))).toBeCloseTo(96, 6);
  });

  it('un césped cóncavo (en L) cubre solo su forma', () => {
    const ell: Polygon = [[0, 0, 10, 0, 10, 2, 2, 2, 2, 10, 0, 10]];

    expect(planArea(lawnOverFloor(floor, [[ell]], NONE))).toBeCloseTo(36, 6);
  });

  it('sobre una rampa sigue su pendiente', () => {
    const ramp = new Float32Array(tri([0, 0, 0], [10, 0, -5], [0, 10, 0]));
    const out = lawnOverFloor(ramp, [[rect(0, 0, 10, 10)]], NONE);

    for (let i = 0; i < out.length; i += 3) expect(out[i + 1]).toBeCloseTo(-out[i] / 2 + LAWN_LIFT_M, 6);
  });

  it('no cubre los muros: un triángulo vertical no tiene planta', () => {
    const wall = new Float32Array(tri([0, 5, 0], [10, 5, 0], [10, 5, -3]));

    expect(lawnOverFloor(wall, [[rect(0, 0, 10, 10)]], NONE)).toHaveLength(0);
  });

  it('el piso está en el marco del modelo: el césped se corre por el anclaje', () => {
    // El modelo está 100 m al este y 50 m al norte (z = -50) del origen de la escena.
    const out = lawnOverFloor(floor, [[rect(102, 52, 106, 55)]], { x: 100, z: -50 });

    expect(planArea(out)).toBeCloseTo(12, 6);
    for (let i = 0; i < out.length; i += 3) {
      expect(out[i]).toBeGreaterThanOrEqual(2 - 1e-6);
      expect(out[i]).toBeLessThanOrEqual(6 + 1e-6);
    }
  });
});

describe('lawnsOverSunken', () => {
  const sunken = [rect(0, 0, 10, 10)];
  const near = [rect(8, 8, 20, 20)];
  const far = [rect(50, 50, 60, 60)];

  it('solo los céspedes que tocan un desnivel: los demás se ven en su capa', () => {
    expect(lawnsOverSunken([near, far], [sunken])).toEqual([near]);
  });

  it('sin desniveles no hay nada que cubrir', () => {
    expect(lawnsOverSunken([near], [])).toEqual([]);
  });
});
