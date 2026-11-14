import fs from 'fs';
import path from 'path';
import type { BuildingModelManifest, GeoJsonGeometry } from '@shared/types';
import { LocalPlane } from '../projection';
import { polygons } from '../sceneData';
import { adjustedRing, adjustmentsOf } from '../viewer/adjustments';

/** Ajustes por edificio del manifiesto (SPEC-108 D-16): una matriz afín en metros este/norte alrededor del anclaje. */
function manifest(adjustments: BuildingModelManifest['adjustments'], nodes: BuildingModelManifest['nodes'] = { k1: 'edificio' }): BuildingModelManifest {
  return { version: 'v', anchor: { lat: -12.07, lon: -77.08 }, nodes, sunken: [], huaca: { label: 'h', at: [-12.07, -77.08, 0] }, groundOnly: [], adjustments };
}

describe('adjustmentsOf', () => {
  it('sin ajustes no hay nada que aplicar', () => {
    expect(adjustmentsOf(manifest(undefined)).size).toBe(0);
  });

  it('devuelve la matriz de cada malla de edificio ajustada', () => {
    expect(adjustmentsOf(manifest({ k1: { matrix: [1, 0, 0, 1, 2, 3], why: 'p' } })).get('k1')).toEqual([1, 0, 0, 1, 2, 3]);
  });

  it('falla con una clave que no es la malla de un edificio del modelo', () => {
    expect(() => adjustmentsOf(manifest({ otro: { matrix: [1, 0, 0, 1, 0, 0], why: 'p' } }))).toThrow(/otro/);
  });

  it('falla con una matriz que no tiene seis números finitos', () => {
    const bad = { k1: { matrix: [1, 0, 0, 1, Number.NaN, 0], why: 'p' } } as unknown as BuildingModelManifest['adjustments'];
    expect(() => adjustmentsOf(manifest(bad))).toThrow(/seis números/);
  });

  it('falla con una matriz que voltea o aplasta la malla', () => {
    expect(() => adjustmentsOf(manifest({ k1: { matrix: [-1, 0, 0, 1, 0, 0], why: 'p' } }))).toThrow(/voltea o aplasta/);
    expect(() => adjustmentsOf(manifest({ k1: { matrix: [0.01, 0, 0, 1, 0, 0], why: 'p' } }))).toThrow(/voltea o aplasta/);
  });
});

describe('adjustedRing', () => {
  it('lleva cada vértice de un anillo plano [x0, y0, x1, y1…] con la misma matriz que la malla', () => {
    expect(adjustedRing([1, 2, 3, 4], [2, 0, 0, 1, 5, -3])).toEqual([7, -1, 11, 1]);
  });
});

describe('el manifiesto del repositorio', () => {
  const backend = path.resolve(__dirname, '../../../../../backend/src/main/resources');
  const repoManifest = JSON.parse(fs.readFileSync(path.join(backend, 'mapa/edificios-plano.json'), 'utf8')) as BuildingModelManifest;
  const migration = (prefix: string) => {
    const dir = path.join(backend, 'db/migration');
    return fs.readFileSync(path.join(dir, fs.readdirSync(dir).find((f) => f.startsWith(prefix))!), 'utf8');
  };
  /**
   * La huella GeoJSON que la migración le pone a cada plan_key, por trozo: V045 trae la clave y la huella en la misma
   * línea (un INSERT tiene muchas filas), V054 en la misma sentencia (el WHERE va en la línea siguiente).
   */
  const footprints = (chunks: string[]) => new Map(chunks.flatMap((chunk) => {
    const key = chunk.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/)?.[0];
    const geojson = chunk.match(/ST_GeomFromGeoJSON\('(\{[^']*\})'\)/)?.[1];
    return key && geojson ? [[key, JSON.parse(geojson) as GeoJsonGeometry] as const] : [];
  }));

  it('trae ajustes válidos: solo de mallas de edificio y con matrices que no voltean ni aplastan', () => {
    expect(() => adjustmentsOf(repoManifest)).not.toThrow();
    expect(Object.values(repoManifest.adjustments ?? {}).every((a) => a.why.length > 0)).toBe(true);
  });

  it('la huella de cada malla ajustada en V054 es su huella anterior con la misma matriz (a 2 cm)', () => {
    const plane = new LocalPlane(repoManifest.anchor.lat, repoManifest.anchor.lon);
    const shift = migration('V053__').match(/ST_Translate\(footprint, (-?[\d.]+), (-?[\d.]+)\)/)!;
    const [dLon, dLat] = [Number(shift[1]), Number(shift[2])];
    const before = footprints(migration('V045__').split('\n')), after = footprints(migration('V054__').split(';'));
    const moved = (c: unknown): unknown => (typeof (c as number[])[0] === 'number' ? [(c as number[])[0] + dLon, (c as number[])[1] + dLat] : (c as unknown[]).map(moved));
    const pairs = (g: GeoJsonGeometry) => {
      const flat = polygons(g, plane).flat(2);
      return Array.from({ length: flat.length / 2 }, (_, i) => [flat[2 * i], flat[2 * i + 1]]);
    };
    // Distancia de Hausdorff entre vértices: V054 sale de la huella ya guardada, que puede empezar el anillo en otro vértice.
    const farthest = (a: number[][], b: number[][]) => Math.max(...a.map(([x, y]) => Math.min(...b.map(([u, v]) => Math.hypot(x - u, y - v)))));
    const adjustments = [...adjustmentsOf(repoManifest)];

    const off = adjustments.map(([key, m]) => {
      const shifted = { ...before.get(key)!, coordinates: moved(before.get(key)!.coordinates) } as GeoJsonGeometry;
      const expected = pairs(shifted).map(([x, y]) => adjustedRing([x, y], m));
      const actual = pairs(after.get(key)!);
      return [key, Math.max(farthest(actual, expected), farthest(expected, actual))] as const;
    }).filter(([, metres]) => !(metres < 0.02));

    expect(adjustments.length).toBeGreaterThan(0);
    expect(off).toEqual([]);
  });
});
