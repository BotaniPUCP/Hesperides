import type { BuildingModelManifest, BuildingPiece, PlanPoint } from '@shared/types';
import { trianglesOf, type V } from '../__fixtures__/meshInspect';
import { fittedFootprints, planFootprintsBeforeFits, repoManifest } from '../__fixtures__/repoFootprints';
import { LocalPlane } from '../projection';
import { polygons, type Polygon } from '../sceneData';
import { piecesOf, splitPiece } from '../viewer/pieces';

/** Dos triángulos por cuadrilátero, con sus vértices en [este, norte, cota]. */
const quad = (a: V, b: V, c: V, d: V) => [a, b, c, a, c, d].flatMap(([east, north, z]) => [east, z, -north]);

/** Un edificio de 10 × 10 m y, a 2 m de su muro este, un quiosco de 2 × 2 m que el SKP dibujó en la misma malla. */
const main = [
  ...quad([10, 0, 0], [10, 10, 0], [10, 10, 6], [10, 0, 6]),
  ...quad([0, 0, 6], [10, 0, 6], [10, 10, 6], [0, 10, 6]),
];
const kiosk = [
  ...quad([12, 0, 0], [14, 0, 0], [14, 0, 3], [12, 0, 3]),
  ...quad([12, 0, 3], [14, 0, 3], [14, 2, 3], [12, 2, 3]),
];
const piece: BuildingPiece = { from: 'k1', polygon: [[12, 0], [14, 0], [14, 2], [12, 2]], why: 'prueba' };

function manifest(pieces: BuildingModelManifest['pieces'], nodes: BuildingModelManifest['nodes'] = { k1: 'edificio', suelo: 'suelo' }): BuildingModelManifest {
  return { version: 'v', anchor: { lat: -12.07, lon: -77.08 }, nodes, sunken: [], huaca: { label: 'h', at: [-12.07, -77.08, 0] }, groundOnly: [], pieces };
}

describe('piecesOf', () => {
  it('sin piezas no hay nada que separar', () => {
    expect(piecesOf(manifest(undefined)).size).toBe(0);
  });

  it('devuelve cada pieza por su clave, con la malla de la que sale', () => {
    expect(piecesOf(manifest({ quiosco: piece })).get('quiosco')).toBe(piece);
  });

  it('falla si la pieza sale de algo que no es la malla de un edificio del modelo', () => {
    expect(() => piecesOf(manifest({ quiosco: { ...piece, from: 'suelo' } }))).toThrow(/quiosco/);
    expect(() => piecesOf(manifest({ quiosco: { ...piece, from: 'otro' } }))).toThrow(/quiosco/);
  });

  it('falla si la clave de la pieza ya es un nodo del modelo: serían dos mallas con la misma clave', () => {
    expect(() => piecesOf(manifest({ k1: piece }))).toThrow(/k1/);
  });

  it('falla con un polígono de menos de tres puntos o con un punto que no son dos números finitos', () => {
    expect(() => piecesOf(manifest({ quiosco: { ...piece, polygon: [[12, 0], [14, 0]] } }))).toThrow(/tres puntos/);
    const bad = [[12, 0], [14, Number.NaN], [14, 2]] as PlanPoint[];
    expect(() => piecesOf(manifest({ quiosco: { ...piece, polygon: bad } }))).toThrow(/dos números/);
  });
});

describe('splitPiece', () => {
  const input = Float32Array.from([...main, ...kiosk]);

  it('pasa a la pieza los triángulos que caen enteros en su polígono y deja los demás en su orden', () => {
    const { kept, piece: taken } = splitPiece(input, piece.polygon, 'quiosco');

    expect(Array.from(kept)).toEqual(Array.from(Float32Array.from(main)));
    expect(Array.from(taken)).toEqual(Array.from(Float32Array.from(kiosk)));
  });

  it('un vértice a menos de 2 cm del borde cuenta como dentro: el manifiesto redondea al milímetro', () => {
    // 1 cm hacia adentro por lado: las esquinas del quiosco quedan a 1,4 cm del polígono.
    const shrunk: PlanPoint[] = [[12.01, 0.01], [13.99, 0.01], [13.99, 1.99], [12.01, 1.99]];

    expect(trianglesOf(splitPiece(input, shrunk, 'quiosco').piece)).toHaveLength(4);
  });

  it('un triángulo que cruza el borde se queda en el edificio: solo se lleva lo que cae entero', () => {
    const half: PlanPoint[] = [[12, 0], [13, 0], [13, 2], [12, 2]];
    const crossing = Float32Array.from([...main, ...kiosk, ...quad([12.2, 0.5, 0], [12.8, 0.5, 0], [12.8, 0.5, 1], [12.2, 0.5, 1])]);

    expect(trianglesOf(splitPiece(crossing, half, 'quiosco').piece)).toHaveLength(2);
  });

  it('falla si el polígono no toma nada: el manifiesto ya no calza con el modelo', () => {
    expect(() => splitPiece(input, [[30, 30], [32, 30], [32, 32]], 'quiosco')).toThrow(/quiosco no toma nada/);
  });

  it('falla si el polígono se lleva toda la malla: eso no es separar un edificio de otro', () => {
    expect(() => splitPiece(input, [[-1, -1], [20, -1], [20, 20], [-1, 20]], 'quiosco')).toThrow(/toda la malla/);
  });
});

describe('las piezas del manifiesto del repositorio', () => {
  const manifestOfRepo = repoManifest();
  const pieces = piecesOf(manifestOfRepo);
  const plane = new LocalPlane(manifestOfRepo.anchor.lat, manifestOfRepo.anchor.lon);
  const LIBRERIA_PUCP = '4ee6b413-6f00-4a87-a25c-c7aa5b6cfcae';
  const JUAN_VALDEZ = '5c6e8c9f-26bb-4285-b29c-26b5edd25c35';
  const ringArea = (r: number[]) => Math.abs(r.reduce((s, _, i) => (i % 2 ? s : s + r[i] * r[(i + 3) % r.length] - r[(i + 2) % r.length] * r[i + 1]), 0)) / 2;
  const area = (ps: Polygon[]) => ps.reduce((s, [outer, ...holes]) => s + ringArea(outer) - holes.reduce((h, r) => h + ringArea(r), 0), 0);
  const points = (ps: Polygon[]) => ps.flat().flatMap((r) => Array.from({ length: r.length / 2 }, (_, i) => [r[2 * i], r[2 * i + 1]] as PlanPoint));
  const near = (a: PlanPoint, b: PlanPoint) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.02;

  it('trae el Juan Valdez, que sale de la malla de la Librería PUCP, y cada pieza dice por qué', () => {
    expect(pieces.get(JUAN_VALDEZ)?.from).toBe(LIBRERIA_PUCP);
    expect([...pieces.values()].every((p) => p.why.length > 0)).toBe(true);
  });

  it('la huella de cada pieza en la base es su polígono (a 2 cm)', () => {
    const after = fittedFootprints();

    for (const [key, p] of pieces) {
      const is = points(polygons(after.get(key)!, plane));

      expect(is.filter((q) => !p.polygon.some((r) => near(q, r)))).toEqual([]);
      expect(p.polygon.filter((r) => !is.some((q) => near(q, r)))).toEqual([]);
    }
  });

  it('la huella de la malla de la que sale es en la base la de antes sin la pieza (a 2 cm)', () => {
    const before = planFootprintsBeforeFits(), after = fittedFootprints();

    for (const p of pieces.values()) {
      const was = polygons(before.get(p.from)!, plane), is = polygons(after.get(p.from)!, plane);

      expect(area(was) - area(is)).toBeCloseTo(ringArea(p.polygon.flat()), 1);
      expect(points(is).filter((q) => !points(was).some((r) => near(q, r)))).toEqual([]);
      expect(points(is).filter((q) => p.polygon.some((r) => near(q, r)))).toEqual([]);
    }
  });
});
