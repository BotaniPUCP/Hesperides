import fs from 'fs';
import path from 'path';
import { BUILDING_LOOKS } from '../looks';
import { buildLookTable } from '../lookTable';
import { validateLooks } from '../validateLook';

/** Los plan_key que crea V040: toda ficha debe apuntar a uno de ellos. */
function planKeysOfMigration(): Set<string> {
  const sql = fs.readFileSync(path.resolve(__dirname, '../../../../../../backend/src/main/resources/db/migration/V040__group_buildings_by_plan.sql'), 'utf8');
  return new Set(sql.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g) ?? []);
}

describe('fichas de apariencia del repositorio', () => {
  it('todas son válidas y apuntan a edificios de V040', () => {
    expect(BUILDING_LOOKS.length).toBeGreaterThan(0);
    expect(() => validateLooks(BUILDING_LOOKS, planKeysOfMigration())).not.toThrow();
  });

  it('caben en la tabla del shader', () => {
    const table = buildLookTable(BUILDING_LOOKS);
    expect(table.zones.size).toBe(BUILDING_LOOKS.length);
    expect(table.data.every(Number.isFinite)).toBe(true);
  });

  it('cada ficha cita al menos una foto de su carpeta', () => {
    BUILDING_LOOKS.forEach((look) => expect(look.photos.length).toBeGreaterThan(0));
  });
});
