import fs from 'fs';
import path from 'path';
import { BUILDING_LOOKS } from '../looks';
import { buildLookTable } from '../lookTable';
import { validateLooks } from '../validateLook';

/** Los plan_key que crea V045: toda ficha debe apuntar a uno de ellos. */
function planKeysOfMigration(): Set<string> {
  const sql = fs.readFileSync(path.resolve(__dirname, '../../../../../../backend/src/main/resources/db/migration/V045__group_buildings_by_plan.sql'), 'utf8');
  return new Set(sql.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g) ?? []);
}

const lookFiles = () => fs.readdirSync(path.resolve(__dirname, '../looks')).filter((name) => name.endsWith('.json'));

describe('fichas de apariencia del repositorio', () => {
  it('todas son válidas y apuntan a edificios de V045', () => {
    expect(() => validateLooks(BUILDING_LOOKS, planKeysOfMigration())).not.toThrow();
  });

  it('caben en la tabla del shader', () => {
    const table = buildLookTable(BUILDING_LOOKS);
    expect(table.zones.size).toBe(BUILDING_LOOKS.length);
    expect(table.data.every(Number.isFinite)).toBe(true);
  });

  it('el índice trae todas las fichas de la carpeta (se regenera con scripts/real-look-index.mjs)', () => {
    expect(BUILDING_LOOKS.map((look) => look.planKey).sort()).toEqual(
      lookFiles().map((name) => JSON.parse(fs.readFileSync(path.resolve(__dirname, '../looks', name), 'utf8')).planKey).sort(),
    );
  });
});
