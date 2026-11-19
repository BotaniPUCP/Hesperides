import type { StairFlight, StairLanding } from '@shared/types';
import { along, facing, sumArea, trianglesOf, type V } from '../__fixtures__/meshInspect';
import { flightTriangles, landingTriangles, STAIR_SLAB_M, wallTriangles } from '../viewer/stairMesh';

const vertices = (ts: V[][]) => ts.flat();

describe('wallTriangles', () => {
  it('levanta un muro vertical sobre el segmento, de la cota de abajo a la de arriba', () => {
    const wall = trianglesOf(wallTriangles([0, 0], [4, 0], 0.2, 4.35));

    expect(wall).toHaveLength(2);
    expect(along(wall, 1)).toHaveLength(2);
    expect(sumArea(wall)).toBeCloseTo(4 * 4.15, 6);
    expect(vertices(wall).every(([, north, z]) => north === 0 && (z === 0.2 || z === 4.35))).toBe(true);
  });
});

describe('flightTriangles', () => {
  /** Dos metros de ancho y tres de recorrido hacia el norte: diez contrahuellas de 15 cm. */
  const fromGround: StairFlight = { from: [[0, 0], [2, 0]], to: [[0, 3], [2, 3]], fromM: 0.2, toM: 1.7, risers: 10 };
  const fromLanding: StairFlight = { ...fromGround, fromM: 1.7, toM: 3.2 };

  it('sube en contrahuellas iguales, con una huella por contrahuella salvo la última, que sube al descanso', () => {
    const flight = trianglesOf(flightTriangles(fromGround, 0.2, []));
    const treads = along(flight, 2);

    const heights = [...new Set(vertices(treads).map(([, , z]) => z.toFixed(3)))];
    expect(heights).toEqual(Array.from({ length: 9 }, (_, k) => (0.2 + 0.15 * (k + 1)).toFixed(3)));
    expect(sumArea(treads)).toBeCloseTo(2 * 3, 6);
    expect(sumArea(along(flight, 1))).toBeCloseTo(10 * 2 * 0.15, 6);
  });

  it('desde el suelo solo toca la cota del suelo en la arista donde arranca: abajo queda libre', () => {
    const flight = vertices(trianglesOf(flightTriangles(fromGround, 0.2, [])));
    // La cara de abajo sube del arranque hasta la losa del descanso.
    const underside = (north: number) => 0.2 + ((1.7 - STAIR_SLAB_M - 0.2) * north) / 3;

    expect(flight.filter(([, , z]) => z <= 0.2 + 1e-6).every(([, north]) => Math.abs(north) < 1e-6)).toBe(true);
    expect(flight.every(([, north, z]) => z >= underside(north) - 1e-6)).toBe(true);
  });

  it('desde un descanso, la cara de abajo arranca bajo la losa del descanso', () => {
    const flight = vertices(trianglesOf(flightTriangles(fromLanding, 0.2, [])));
    const lowest = Math.min(...flight.map(([, , z]) => z));

    expect(lowest).toBeCloseTo(1.7 - STAIR_SLAB_M, 6);
    expect(flight.filter(([, , z]) => z < lowest + 1e-6).every(([, north]) => Math.abs(north) < 1e-6)).toBe(true);
  });

  it('cierra los dos costados entre los peldaños y la cara de abajo', () => {
    const sides = along(trianglesOf(flightTriangles(fromGround, 0.2, [])), 0);
    // Bajo los peldaños: (1/3 m) · Σ (0,2 + 0,15·k), k = 1…9; bajo la cara de abajo: 3 m · (0,2 + 1,5) / 2.
    const perSide = (1 / 3) * (9 * 0.2 + 0.15 * 45) - 3 * (0.2 + 1.5) / 2;

    expect(sumArea(sides.filter((t) => t.every(([east]) => east === 0)))).toBeCloseTo(perSide, 6);
    expect(sumArea(sides.filter((t) => t.every(([east]) => east === 2)))).toBeCloseTo(perSide, 6);
  });

  it('no dibuja el costado que da a un muro', () => {
    const sides = along(trianglesOf(flightTriangles(fromGround, 0.2, [[[0, -1], [0, 10]]])), 0);

    expect(sides.some((t) => t.every(([east]) => east === 0))).toBe(false);
    expect(sides.some((t) => t.every(([east]) => east === 2))).toBe(true);
  });
});

describe('landingTriangles', () => {
  const landing: StairLanding = { polygon: [[0, 3], [2, 3], [2, 5], [0, 5]], atM: 1.7 };

  it('es una losa a su cota: arriba y abajo cubren el polígono', () => {
    const slab = along(trianglesOf(landingTriangles(landing, [])), 2);
    const at = (z: number) => slab.filter((t) => t.every(([, , h]) => Math.abs(h - z) < 1e-6));

    expect(sumArea(at(1.7))).toBeCloseTo(4, 6);
    expect(sumArea(at(1.7 - STAIR_SLAB_M))).toBeCloseTo(4, 6);
  });

  it('lleva canto en los bordes libres y no en los pegados a un tramo o a un muro', () => {
    const edge = (attached: [[number, number], [number, number]][]) =>
      sumArea(trianglesOf(landingTriangles(landing, attached)).filter((t) => facing(t, 2) < 1e-6));
    // El tramo llega por el borde sur; el muro del oeste es más largo que el borde que toca.
    const attached: [[number, number], [number, number]][] = [[[0, 3], [2, 3]], [[0, 9], [0, 0]]];

    expect(edge([])).toBeCloseTo(8 * STAIR_SLAB_M, 6);
    expect(edge(attached)).toBeCloseTo(4 * STAIR_SLAB_M, 6);
  });
});
