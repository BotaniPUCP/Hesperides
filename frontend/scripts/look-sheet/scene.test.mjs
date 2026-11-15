// Pruebas de la herramienta local de hojas (SPEC-112 D-11). Corre con: node --test scripts/look-sheet/
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { classifiedBuilding, footprintsAfterV053, footprintsOfV045, shiftOfV053 } from './scene.mjs';

const geo = (x) => `ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_Force2D(ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[${x},0],[${x},1],[${x + 1},1],[${x},0]]]}'), 4326)))))`;
const KEY_UPDATE = '11111111-1111-4111-8111-111111111111';
const KEY_ROW_1 = '22222222-2222-4222-8222-222222222222';
const KEY_ROW_2 = '33333333-3333-4333-8333-333333333333';
const KEY_UPDATE_OSM = '44444444-4444-4444-8444-444444444444';
const KEY_ROW_OSM = '55555555-5555-4555-8555-555555555555';
// Como V045: un UPDATE por edificio y un INSERT con una fila por principal nuevo; source = 'PUCP' solo si la
// geometría es del SKP (los edificios sin pieza del SKP guardan su contorno de OpenStreetMap).
const SQL = [
  `UPDATE campus_buildings SET plan_key = '${KEY_UPDATE}', name = 'Uno', footprint = ${geo(1)}, height_m = 9.4, base_m = 0, source = 'PUCP', updated_at = CURRENT_TIMESTAMP\n WHERE source_ref = 'way/1';`,
  `UPDATE campus_buildings SET plan_key = '${KEY_UPDATE_OSM}', name = 'Cuatro', footprint = ${geo(4)}, height_m = 3, base_m = 0, updated_at = CURRENT_TIMESTAMP\n WHERE source_ref = 'way/4';`,
  'INSERT INTO campus_buildings (source, plan_key, name, category_item_id, is_campus, footprint, height_m, base_m) VALUES',
  `    ('PUCP', '${KEY_ROW_1}', 'Dos', (SELECT 1), TRUE, ${geo(2)}, 46.2, 0),`,
  `    ('PUCP', '${KEY_ROW_2}', 'Tres', (SELECT 1), TRUE, ${geo(3)}, 23.9, 0),`,
  `    ('OSM', '${KEY_ROW_OSM}', 'Cinco', (SELECT 1), TRUE, ${geo(5)}, 3, 0);`,
  '',
].join('\n');
const V053 = [
  'UPDATE campus_buildings',
  '   SET footprint = ST_Translate(footprint, -0.000023880677126684355, -0.000023503283647569735),',
  '       updated_at = CURRENT_TIMESTAMP',
  ` WHERE (source = 'PUCP' OR plan_key = '${KEY_UPDATE_OSM}') AND deleted_at IS NULL;`,
].join('\n');
const REPO_V053 = new URL('../../../backend/src/main/resources/db/migration/V053__shift_plan_footprints_to_gardens.sql', import.meta.url);

test('lee la huella de cada UPDATE', () => {
  assert.equal(footprintsOfV045(SQL).get(KEY_UPDATE)?.geojson.coordinates[0][0][0], 1);
});

test('lee la huella de cada fila del INSERT, no solo la primera', () => {
  const footprints = footprintsOfV045(SQL);
  assert.equal(footprints.get(KEY_ROW_1)?.geojson.coordinates[0][0][0], 2);
  assert.equal(footprints.get(KEY_ROW_2)?.geojson.coordinates[0][0][0], 3);
});

test('sabe qué huellas son del SKP y cuáles de OpenStreetMap', () => {
  const footprints = footprintsOfV045(SQL);
  assert.deepEqual([KEY_UPDATE, KEY_ROW_1, KEY_ROW_2].map((key) => footprints.get(key)?.fromThePlan), [true, true, true]);
  assert.deepEqual([KEY_UPDATE_OSM, KEY_ROW_OSM].map((key) => footprints.get(key)?.fromThePlan), [false, false]);
});

test('lee de V053 los grados del corrimiento y los edificios que nombra aparte', () => {
  assert.deepEqual(shiftOfV053(V053), { dLon: -0.000023880677126684355, dLat: -0.000023503283647569735, planKeys: [KEY_UPDATE_OSM] });
});

test('la V053 del repositorio trae su corrimiento', () => {
  assert.ok(shiftOfV053(fs.readFileSync(REPO_V053, 'utf8')).dLon < 0);
});

test('falla si V053 ya no trae el corrimiento', () => {
  assert.throws(() => shiftOfV053('UPDATE campus_buildings SET name = name;'), /V053/);
});

test('tras V053 solo se corren las huellas del SKP, vértice por vértice', () => {
  const after = footprintsAfterV053(footprintsOfV045(SQL), { dLon: 0.5, dLat: -0.25, planKeys: [] });
  assert.deepEqual(after.get(KEY_UPDATE).coordinates[0][0], [1.5, -0.25]);
  assert.deepEqual(after.get(KEY_ROW_1).coordinates[0][2], [3.5, 0.75]);
  assert.deepEqual(after.get(KEY_UPDATE_OSM).coordinates[0][0], [4, 0]);
  assert.deepEqual(after.get(KEY_ROW_OSM).coordinates[0][0], [5, 0]);
});

test('también se corre la de OpenStreetMap que V053 nombra (la caseta con malla del SKP)', () => {
  const after = footprintsAfterV053(footprintsOfV045(SQL), { dLon: 0.5, dLat: -0.25, planKeys: [KEY_UPDATE_OSM] });
  assert.deepEqual(after.get(KEY_UPDATE_OSM).coordinates[0][0], [4.5, -0.25]);
  assert.deepEqual(after.get(KEY_ROW_OSM).coordinates[0][0], [5, 0]);
});

test('también corre los multipolígonos', () => {
  const multi = new Map([[KEY_UPDATE, { geojson: { type: 'MultiPolygon', coordinates: [[[[1, 2], [3, 4]]]] }, fromThePlan: true }]]);
  assert.deepEqual(footprintsAfterV053(multi, { dLon: 1, dLat: 1, planKeys: [] }).get(KEY_UPDATE).coordinates, [[[[2, 3], [4, 5]]]]);
});

test('con un ajuste en el manifiesto (D-16), la malla y su huella llegan ajustadas a la clasificación, como en el visor', () => {
  const calls = [];
  const shiftEast = (m) => m[4];
  const realLook = {
    LocalPlane: class {},
    polygons: () => [[[0, 0, 1, 0, 1, 1]]],
    buildLookTable: () => ({ zones: new Map([['k', []]]) }),
    classifyBuilding: (positions, start, n, footprint) => calls.push({ positions: Array.from(positions), footprint }),
    adjustmentsOf: () => new Map([['k', [1, 0, 0, 1, 10, 0]]]),
    adjusted: (p, m) => Float32Array.from(p, (v, i) => (i % 3 === 0 ? v + shiftEast(m) : v)),
    adjustedRing: (ring, m) => ring.map((v, i) => (i % 2 === 0 ? v + shiftEast(m) : v)),
    stairsOf: () => new Map(),
    withStair: () => assert.fail('sin escalera no se toca la malla'),
    piecesOf: () => new Map(),
    splitPiece: () => assert.fail('sin piezas no se parte la malla'),
  };
  const campus = { manifest: { anchor: { lat: 0, lon: 0 } }, nodes: new Map([['k', new Float32Array([1, 2, 3])]]), footprints: new Map([['k', {}]]) };

  const building = classifiedBuilding(campus, { planKey: 'k', name: 'K' }, realLook);

  assert.deepEqual(calls[0].positions, [11, 2, 3]);
  assert.deepEqual(calls[0].footprint, [[[10, 0, 11, 0, 11, 1]]]);
  assert.deepEqual(Array.from(building.positions), [11, 2, 3]);
});

test('con una escalera en el manifiesto (D-17), la malla llega con su escalera y la clasificación sabe dónde empieza', () => {
  const calls = [];
  const realLook = {
    LocalPlane: class {},
    polygons: () => [[[0, 0, 1, 0, 1, 1]]],
    buildLookTable: () => ({ zones: new Map([['k', []]]) }),
    classifyBuilding: (positions, start, n, footprint, zones, out, plainFrom) => calls.push({ positions: Array.from(positions), n, plainFrom }),
    adjustmentsOf: () => new Map(),
    adjusted: () => assert.fail('sin ajuste no se corre la malla'),
    adjustedRing: () => assert.fail('sin ajuste no se corre la huella'),
    stairsOf: () => new Map([['k', { why: 'prueba' }]]),
    withStair: (p, stair, key) => ({ positions: Float32Array.from([...p, 7, 8, 9]), stairFrom: key === 'k' && stair.why ? 1 : -1 }),
    piecesOf: () => new Map(),
    splitPiece: () => assert.fail('sin piezas no se parte la malla'),
  };
  const campus = { manifest: { anchor: { lat: 0, lon: 0 } }, nodes: new Map([['k', new Float32Array([1, 2, 3])]]), footprints: new Map([['k', {}]]) };

  const building = classifiedBuilding(campus, { planKey: 'k', name: 'K' }, realLook);

  assert.deepEqual(calls[0], { positions: [1, 2, 3, 7, 8, 9], n: 2, plainFrom: 1 });
  assert.deepEqual(Array.from(building.positions), [1, 2, 3, 7, 8, 9]);
});

/** Los módulos del visor para una malla `k` con dos triángulos de mentira, de los que la pieza `p` se lleva el segundo. */
function withPiece(calls) {
  return {
    LocalPlane: class {},
    polygons: () => [[[9, 9, 9, 9, 9, 9]]],
    buildLookTable: (looks) => ({ zones: new Map([[looks[0].planKey, []]]) }),
    classifyBuilding: (positions, start, n, footprint) => calls.push({ positions: Array.from(positions), footprint }),
    adjustmentsOf: () => new Map(),
    adjusted: () => assert.fail('sin ajuste no se corre la malla'),
    adjustedRing: () => assert.fail('sin ajuste no se corre la huella'),
    stairsOf: () => new Map(),
    withStair: () => assert.fail('sin escalera no se toca la malla'),
    piecesOf: () => new Map([['p', { from: 'k', polygon: [[0, 0], [1, 0], [1, 1]], why: 'prueba' }]]),
    splitPiece: (p, polygon, key) => (key === 'p' && polygon.length === 3 ? { kept: p.slice(0, 3), piece: p.slice(3) } : assert.fail('otra pieza')),
  };
}
const campusWithPiece = () => ({ manifest: { anchor: { lat: 0, lon: 0 } }, nodes: new Map([['k', new Float32Array([1, 2, 3, 4, 5, 6])]]), footprints: new Map([['k', {}]]) });

test('con una pieza en el manifiesto (D-18), la malla de la que sale llega sin ella a la clasificación, como en el visor', () => {
  const calls = [];

  const building = classifiedBuilding(campusWithPiece(), { planKey: 'k', name: 'K' }, withPiece(calls));

  assert.deepEqual(calls[0].positions, [1, 2, 3]);
  assert.deepEqual(Array.from(building.positions), [1, 2, 3]);
});

test('una pieza (D-18) se clasifica con sus triángulos y con su polígono como huella: V045 no la trae', () => {
  const calls = [];

  const building = classifiedBuilding(campusWithPiece(), { planKey: 'p', name: 'P' }, withPiece(calls));

  assert.deepEqual(calls[0], { positions: [4, 5, 6], footprint: [[[0, 0, 1, 0, 1, 1]]] });
  assert.deepEqual(Array.from(building.positions), [4, 5, 6]);
});
