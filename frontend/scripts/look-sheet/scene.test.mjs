// Pruebas de la herramienta local de hojas (SPEC-112 D-11). Corre con: node --test scripts/look-sheet/
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { footprintsOfV045 } from './scene.mjs';

const geo = (x) => `ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_Force2D(ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[${x},0],[${x},1],[${x + 1},1],[${x},0]]]}'), 4326)))))`;
const KEY_UPDATE = '11111111-1111-4111-8111-111111111111';
const KEY_ROW_1 = '22222222-2222-4222-8222-222222222222';
const KEY_ROW_2 = '33333333-3333-4333-8333-333333333333';
// Como V045: un UPDATE por edificio y un INSERT con una fila por principal nuevo.
const SQL = [
  `UPDATE campus_buildings SET plan_key = '${KEY_UPDATE}', name = 'Uno', footprint = ${geo(1)}, height_m = 9.4\n WHERE source_ref = 'way/1';`,
  'INSERT INTO campus_buildings (source, plan_key, name, category_item_id, is_campus, footprint, height_m, base_m) VALUES',
  `    ('PUCP', '${KEY_ROW_1}', 'Dos', (SELECT 1), TRUE, ${geo(2)}, 46.2, 0),`,
  `    ('PUCP', '${KEY_ROW_2}', 'Tres', (SELECT 1), TRUE, ${geo(3)}, 23.9, 0);`,
  '',
].join('\n');

test('lee la huella de cada UPDATE', () => {
  assert.equal(footprintsOfV045(SQL).get(KEY_UPDATE)?.coordinates[0][0][0], 1);
});

test('lee la huella de cada fila del INSERT, no solo la primera', () => {
  const footprints = footprintsOfV045(SQL);
  assert.equal(footprints.get(KEY_ROW_1)?.coordinates[0][0][0], 2);
  assert.equal(footprints.get(KEY_ROW_2)?.coordinates[0][0][0], 3);
});
