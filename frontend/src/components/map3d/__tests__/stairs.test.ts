import type { BuildingModelManifest, BuildingStair, PlanPoint } from '@shared/types';
import { along, centroidOf, trianglesOf, verticesOf, type V } from '../__fixtures__/meshInspect';
import { fittedFootprints, planFootprintsBeforeFits, repoManifest } from '../__fixtures__/repoFootprints';
import { LocalPlane } from '../projection';
import { polygons, type Polygon } from '../sceneData';
import { insideRing } from '../viewer/picking';
import { STAIR_SLAB_M } from '../viewer/stairMesh';
import { stairsOf, withStair } from '../viewer/stairs';

/** Dos triángulos por cuadrilátero, con sus vértices en [este, norte, cota]. */
const quad = (a: V, b: V, c: V, d: V) => [a, b, c, a, c, d].flatMap(([east, north, z]) => [east, z, -north]);

/**
 * Un edificio de 10 × 10 m y 6 m de alto con un bloque de 2 × 6 m y 3 m de alto pegado a su muro este: el bloque
 * es en realidad una escalera. Sobre el bloque, el muro del edificio sigue de 3 a 6 m.
 */
const main = Float32Array.from([
  ...quad([10, 0, 0.2], [10, 2, 0.2], [10, 2, 6], [10, 0, 6]),
  ...quad([10, 8, 0.2], [10, 10, 0.2], [10, 10, 6], [10, 8, 6]),
  ...quad([10, 2, 3], [10, 8, 3], [10, 8, 6], [10, 2, 6]),
  ...quad([0, 0, 6], [10, 0, 6], [10, 10, 6], [0, 10, 6]),
]);
const block = [
  ...quad([10, 2, 3], [12, 2, 3], [12, 8, 3], [10, 8, 3]),
  ...quad([10, 2, 0.2], [12, 2, 0.2], [12, 2, 3], [10, 2, 3]),
  ...quad([12, 2, 0.2], [12, 8, 0.2], [12, 8, 3], [12, 2, 3]),
  ...quad([12, 8, 0.2], [10, 8, 0.2], [10, 8, 3], [12, 8, 3]),
];
const stair: BuildingStair = {
  replaces: { polygon: [[10, 2], [12, 2], [12, 8], [10, 8]], fromM: 0.2, toM: 3 },
  walls: [[[10, 2], [10, 8]]],
  flights: [{ from: [[10, 2], [12, 2]], to: [[10, 6], [12, 6]], fromM: 0.2, toM: 3, risers: 16 }],
  landings: [{ polygon: [[10, 6], [12, 6], [12, 8], [10, 8]], atM: 3 }],
  why: 'prueba',
};

function manifest(stairs: BuildingModelManifest['stairs'], nodes: BuildingModelManifest['nodes'] = { k1: 'edificio' }): BuildingModelManifest {
  return { version: 'v', anchor: { lat: -12.07, lon: -77.08 }, nodes, sunken: [], huaca: { label: 'h', at: [-12.07, -77.08, 0] }, groundOnly: [], stairs };
}

const near0 = (a: number, b: number) => Math.abs(a - b) < 1e-5;

describe('stairsOf', () => {
  const flight = stair.flights[0];
  const withFlight = (changes: Partial<typeof flight>) => manifest({ k1: { ...stair, flights: [{ ...flight, ...changes }] } });

  it('sin escaleras no hay nada que aplicar', () => {
    expect(stairsOf(manifest(undefined)).size).toBe(0);
  });

  it('devuelve la escalera de cada malla de edificio', () => {
    expect(stairsOf(manifest({ k1: stair })).get('k1')).toBe(stair);
  });

  it('falla con una clave que no es la malla de un edificio del modelo', () => {
    expect(() => stairsOf(manifest({ otro: stair }))).toThrow(/otro/);
  });

  it('falla con un tramo de menos de dos contrahuellas', () => {
    expect(() => stairsOf(withFlight({ risers: 1 }))).toThrow(/contrahuellas/);
    expect(() => stairsOf(withFlight({ risers: 2.5 }))).toThrow(/contrahuellas/);
  });

  it('falla si una contrahuella mide lo que la losa o más: la cara de abajo cortaría los peldaños', () => {
    expect(() => stairsOf(withFlight({ fromM: 0.2, toM: 0.2 + 4 * STAIR_SLAB_M, risers: 4 }))).toThrow(/losa/);
  });

  it('falla si un tramo o la parte reemplazada no sube', () => {
    expect(() => stairsOf(withFlight({ fromM: 3, toM: 0.2 }))).toThrow(/sube/);
    expect(() => stairsOf(manifest({ k1: { ...stair, replaces: { ...stair.replaces, toM: 0.2 } } }))).toThrow(/sube/);
  });

  it('falla con un punto que no son dos números finitos', () => {
    const bad = [[10, 6], [12, Number.NaN], [12, 8]] as PlanPoint[];
    expect(() => stairsOf(manifest({ k1: { ...stair, landings: [{ polygon: bad, atM: 3 }] } }))).toThrow(/dos números/);
  });
});

describe('withStair', () => {
  const input = Float32Array.from([...main, ...block]);
  const { positions, stairFrom } = withStair(input, stair, 'k1');
  const wallEnd = main.length / 3 + 6;
  const stairPart = verticesOf(positions.slice(stairFrom * 3));

  it('quita los triángulos que caen enteros en la parte reemplazada y deja, en su orden, los que sobresalen', () => {
    expect(Array.from(positions.slice(0, main.length))).toEqual(Array.from(main));
    // Del techo del bloque a 3 m no queda nada: a esa cota solo está el descanso de arriba.
    const at3 = along(trianglesOf(positions), 2).filter((t) => t.every(([, , z]) => near0(z, 3)));
    expect(at3.length).toBeGreaterThan(0);
    expect(at3.every((t) => centroidOf(t)[1] > 6)).toBe(true);
  });

  it('cierra el edificio con un muro donde estaba pegada la parte quitada, entre sus dos cotas', () => {
    const wall = verticesOf(positions.slice(main.length, wallEnd * 3));

    expect(wall).toHaveLength(6);
    expect(wall.every(([east, north, z]) => east === 10 && north >= 2 && north <= 8 && (near0(z, 0.2) || near0(z, 3)))).toBe(true);
  });

  it('dibuja la escalera al final: stairFrom marca su primer vértice', () => {
    expect(stairFrom).toBe(wallEnd);
    expect(positions.length / 3).toBeGreaterThan(stairFrom);
  });

  it('la escalera solo toca el suelo en la arista donde arranca', () => {
    expect(stairPart.filter(([, , z]) => z <= 0.2 + 1e-6).every(([, north]) => Math.abs(north - 2) < 1e-5)).toBe(true);
  });

  it('la escalera no sale en planta de la parte que reemplaza', () => {
    expect(stairPart.every(([east, north]) => east >= 10 - 1e-5 && east <= 12 + 1e-5 && north >= 2 - 1e-5 && north <= 8 + 1e-5)).toBe(true);
  });

  it('falla si no hay nada que reemplazar: el manifiesto ya no calza con el modelo', () => {
    expect(() => withStair(main, stair, 'k1')).toThrow(/k1/);
  });
});

describe('las escaleras del manifiesto del repositorio', () => {
  const manifestOfRepo = repoManifest();
  const stairs = stairsOf(manifestOfRepo);
  const near = (a: PlanPoint, b: PlanPoint) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.02;
  const COMEDOR_CENTRAL = 'df5f87ed-a1f7-4fa6-ae35-b7f423f61806';

  it('trae escaleras válidas, cada una con su porqué; la del Comedor Central entre ellas', () => {
    expect(stairs.has(COMEDOR_CENTRAL)).toBe(true);
    expect([...stairs.values()].every((s) => s.why.length > 0)).toBe(true);
  });

  it('cada tramo arranca del suelo o de un descanso y llega a un descanso, arista con arista', () => {
    const landingAt = (s: BuildingStair, z: number) => s.landings.find((l) => Math.abs(l.atM - z) < 1e-6);
    const onLanding = (s: BuildingStair, edge: PlanPoint[], z: number) => edge.every((p) => landingAt(s, z)?.polygon.some((q) => near(p, q)));
    const loose = [...stairs].flatMap(([key, s]) => s.flights
      .filter((f) => !onLanding(s, f.to, f.toM) || !(Math.abs(f.fromM - s.replaces.fromM) < 1e-6 || onLanding(s, f.from, f.fromM)))
      .map((f) => `${key} ${f.fromM}→${f.toM}`));

    expect(loose).toEqual([]);
  });

  it('la huella de cada edificio con escalera es en la base la de antes sin la parte reemplazada (a 2 cm)', () => {
    const plane = new LocalPlane(manifestOfRepo.anchor.lat, manifestOfRepo.anchor.lon);
    const before = planFootprintsBeforeFits(), after = fittedFootprints();
    const ringArea = (r: number[]) => Math.abs(r.reduce((s, _, i) => (i % 2 ? s : s + r[i] * r[(i + 3) % r.length] - r[(i + 2) % r.length] * r[i + 1]), 0)) / 2;
    const area = (ps: Polygon[]) => ps.reduce((s, [outer, ...holes]) => s + ringArea(outer) - holes.reduce((h, r) => h + ringArea(r), 0), 0);
    const points = (ps: Polygon[]) => ps.flat().flatMap((r) => Array.from({ length: r.length / 2 }, (_, i) => [r[2 * i], r[2 * i + 1]] as PlanPoint));
    const toSegment = (p: PlanPoint, a: PlanPoint, b: PlanPoint) => {
      const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
      const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)));
      return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
    };

    for (const [key, s] of stairs) {
      const was = polygons(before.get(key)!, plane), is = polygons(after.get(key)!, plane);
      const cut = s.replaces.polygon, ring = cut.flat();
      const strictlyInside = (p: PlanPoint) => insideRing(p[0], p[1], ring) && cut.every((a, i) => toSegment(p, a, cut[(i + 1) % cut.length]) > 0.02);

      expect(area(was) - area(is)).toBeCloseTo(ringArea(ring), 1);
      expect(points(is).filter((p) => ![...points(was), ...cut].some((q) => near(p, q)))).toEqual([]);
      expect(points(is).filter(strictlyInside)).toEqual([]);
    }
  });
});
