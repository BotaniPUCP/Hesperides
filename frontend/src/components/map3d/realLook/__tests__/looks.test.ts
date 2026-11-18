import fs from 'fs';
import path from 'path';
import { BUILDING_LOOKS } from '../looks';
import { buildLookTable } from '../lookTable';
import { validateLooks } from '../validateLook';

const MIGRATIONS = path.resolve(__dirname, '../../../../../../backend/src/main/resources/db/migration');
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

/**
 * Los plan_key de la base: los que crea V045 y los que una migración posterior le da a otro edificio, como el Juan
 * Valdez que se separa de la Librería PUCP (SPEC-108 D-18). Toda ficha debe apuntar a uno de ellos.
 */
function planKeysOfMigrations(): Set<string> {
  const v045 = fs.readFileSync(path.join(MIGRATIONS, 'V045__group_buildings_by_plan.sql'), 'utf8');
  const assigned = fs.readdirSync(MIGRATIONS).flatMap((file) =>
    [...fs.readFileSync(path.join(MIGRATIONS, file), 'utf8').matchAll(new RegExp(`SET [^;]*plan_key = '(${UUID})'`, 'g'))].map((m) => m[1]));
  const unified = v045.match(/unified:[a-z0-9-]+/g) ?? [];
  return new Set([...(v045.match(new RegExp(UUID, 'g')) ?? []), ...unified, ...assigned]);
}

const lookFiles = () => fs.readdirSync(path.resolve(__dirname, '../looks')).filter((name) => name.endsWith('.json'));

describe('fichas de apariencia del repositorio', () => {
  it('todas son válidas y apuntan a edificios de la base', () => {
    expect(() => validateLooks(BUILDING_LOOKS, planKeysOfMigrations())).not.toThrow();
  });

  it('la clave que una migración le da a otro edificio cuenta: el Juan Valdez la recibe en V057', () => {
    expect(planKeysOfMigrations().has('5c6e8c9f-26bb-4285-b29c-26b5edd25c35')).toBe(true);
  });

  it('cuenta la clave unificada que V045 le da al Lugar prestado, que no es un uuid', () => {
    expect(planKeysOfMigrations().has('unified:lugar-prestado')).toBe(true);
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
