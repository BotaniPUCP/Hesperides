import type { BuildingModelManifest, GeoJsonGeometry } from '@shared/types';
import { fittedFootprints, planFootprintsBeforeFits, repoManifest } from '../__fixtures__/repoFootprints';
import { LocalPlane } from '../projection';
import { polygons } from '../sceneData';
import { adjustedRing, adjustmentsOf, lifted, liftsOf } from '../viewer/adjustments';
import { stairsOf } from '../viewer/stairs';

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

describe('liftsOf', () => {
  it('devuelve cuánto sube (o baja, si es negativo) cada malla que lo pide', () => {
    const lifts = liftsOf(manifest({ k1: { matrix: [1, 0, 0, 1, 0, 0], liftM: -3.9, why: 'p' } }));

    expect(lifts.get('k1')).toBe(-3.9);
  });

  it('un ajuste solo en planta no mueve la altura', () => {
    expect(liftsOf(manifest({ k1: { matrix: [1, 0, 0, 1, 2, 3], why: 'p' } })).size).toBe(0);
  });

  it('falla con una altura que no es un número finito', () => {
    expect(() => liftsOf(manifest({ k1: { matrix: [1, 0, 0, 1, 0, 0], liftM: Number.NaN, why: 'p' } }))).toThrow(/k1.*altura/);
  });

  it('falla con una clave que no es la malla de un edificio del modelo', () => {
    expect(() => liftsOf(manifest({ otro: { matrix: [1, 0, 0, 1, 0, 0], liftM: 1, why: 'p' } }))).toThrow(/otro/);
  });
});

describe('lifted', () => {
  it('mueve solo la cota de cada vértice (y arriba); la planta queda igual', () => {
    expect(Array.from(lifted(new Float32Array([1, 2, 3, 4, 5, 6]), -2))).toEqual([1, 0, 3, 4, 3, 6]);
  });
});

describe('adjustedRing', () => {
  it('lleva cada vértice de un anillo plano [x0, y0, x1, y1…] con la misma matriz que la malla', () => {
    expect(adjustedRing([1, 2, 3, 4], [2, 0, 0, 1, 5, -3])).toEqual([7, -1, 11, 1]);
  });
});

describe('el manifiesto del repositorio', () => {
  const manifestOfRepo = repoManifest();

  it('trae ajustes válidos: solo de mallas de edificio y con matrices que no voltean ni aplastan', () => {
    expect(() => adjustmentsOf(manifestOfRepo)).not.toThrow();
    expect(Object.values(manifestOfRepo.adjustments ?? {}).every((a) => a.why.length > 0)).toBe(true);
  });

  it('baja el Auditorio Juan Pablo II 5 m, sin moverlo en planta: su techo queda bajo el césped del jardín hundido (AV-0166 y AV-0170)', () => {
    const key = '0587a436-a6b7-4214-8d74-9b4883986521';

    expect(liftsOf(manifestOfRepo).get(key)).toBe(-5);
    expect(adjustmentsOf(manifestOfRepo).get(key)).toEqual([1, 0, 0, 1, 0, 0]);
  });

  it('la huella de cada malla ajustada en V054 es su huella anterior con la misma matriz (a 2 cm)', () => {
    const plane = new LocalPlane(manifestOfRepo.anchor.lat, manifestOfRepo.anchor.lon);
    const before = planFootprintsBeforeFits();
    const after = fittedFootprints();
    const pairs = (g: GeoJsonGeometry) => {
      const flat = polygons(g, plane).flat(2);
      return Array.from({ length: flat.length / 2 }, (_, i) => [flat[2 * i], flat[2 * i + 1]]);
    };
    // Distancia de Hausdorff entre vértices: V054 sale de la huella ya guardada, que puede empezar el anillo en otro vértice.
    const farthest = (a: number[][], b: number[][]) => Math.max(...a.map(([x, y]) => Math.min(...b.map(([u, v]) => Math.hypot(x - u, y - v)))));
    const adjustments = [...adjustmentsOf(manifestOfRepo)];
    // La huella de un edificio con escalera la revisa la prueba de las escaleras contra la de antes: su ajuste no
    // puede moverlo en planta (el Auditorio Juan Pablo II solo baja).
    const stairs = stairsOf(manifestOfRepo);
    const identity = [1, 0, 0, 1, 0, 0];
    expect(adjustments.filter(([key, m]) => stairs.has(key) && m.some((v, i) => v !== identity[i]))).toEqual([]);

    const off = adjustments.filter(([key]) => !stairs.has(key)).map(([key, m]) => {
      const expected = pairs(before.get(key)!).map(([x, y]) => adjustedRing([x, y], m));
      // Sin migración que la cambie, la huella es la anterior: un ajuste solo en altura (el auditorio) no la mueve.
      const actual = pairs(after.get(key) ?? before.get(key)!);
      return [key, Math.max(farthest(actual, expected), farthest(expected, actual))] as const;
    }).filter(([, metres]) => !(metres < 0.02));

    expect(adjustments.length).toBeGreaterThan(0);
    expect(off).toEqual([]);
  });
});
