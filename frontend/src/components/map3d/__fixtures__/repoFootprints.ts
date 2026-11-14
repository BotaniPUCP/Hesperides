import fs from 'fs';
import path from 'path';
import type { BuildingModelManifest, GeoJsonGeometry } from '@shared/types';

/**
 * El manifiesto del modelo y las huellas de las migraciones del repositorio, para comprobar en las pruebas que
 * dicen lo mismo (SPEC-108 D-16 y D-17).
 */
const resources = path.resolve(__dirname, '../../../../../backend/src/main/resources');
const migrations = path.join(resources, 'db/migration');
/** La primera migración que cambia huellas a mano (SPEC-108 D-16). */
const FIRST_FIT_VERSION = 54;
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/;

const versionOf = (file: string) => Number(file.match(/^V(\d+)__/)?.[1]);

export function repoManifest(): BuildingModelManifest {
  return JSON.parse(fs.readFileSync(path.join(resources, 'mapa/edificios-plano.json'), 'utf8')) as BuildingModelManifest;
}

function migration(prefix: string): string {
  return fs.readFileSync(path.join(migrations, fs.readdirSync(migrations).find((f) => f.startsWith(prefix))!), 'utf8');
}

/**
 * La huella GeoJSON que cada trozo le pone a su plan_key: V045 trae la clave y la huella en la misma línea (un
 * INSERT tiene muchas filas), V054 y las que le siguen en la misma sentencia (el WHERE va en la línea siguiente).
 */
function footprints(chunks: string[]): Map<string, GeoJsonGeometry> {
  return new Map(chunks.flatMap((chunk) => {
    const key = chunk.match(UUID)?.[0];
    const geojson = chunk.match(/ST_GeomFromGeoJSON\('(\{[^']*\})'\)/)?.[1];
    return key && geojson ? [[key, JSON.parse(geojson) as GeoJsonGeometry] as const] : [];
  }));
}

/**
 * Las huellas de V045 corridas hacia los jardines con los grados de V053. Solo vale para los edificios con malla
 * del plano: V053 no corre las de OpenStreetMap.
 */
export function planFootprintsBeforeFits(): Map<string, GeoJsonGeometry> {
  const shift = migration('V053__').match(/ST_Translate\(footprint, (-?[\d.]+), (-?[\d.]+)\)/)!;
  const [dLon, dLat] = [Number(shift[1]), Number(shift[2])];
  const moved = (c: unknown): unknown => (typeof (c as number[])[0] === 'number'
    ? [(c as number[])[0] + dLon, (c as number[])[1] + dLat] : (c as unknown[]).map(moved));
  const before = footprints(migration('V045__').split('\n'));
  return new Map([...before].map(([key, g]) => [key, { ...g, coordinates: moved(g.coordinates) } as GeoJsonGeometry]));
}

/** Las huellas que V054 y las migraciones que le siguen ponen a mano: gana la última, como en la base. */
export function fittedFootprints(): Map<string, GeoJsonGeometry> {
  const files = fs.readdirSync(migrations).filter((f) => versionOf(f) >= FIRST_FIT_VERSION).sort((a, b) => versionOf(a) - versionOf(b));
  return footprints(files.flatMap((f) => fs.readFileSync(path.join(migrations, f), 'utf8').split(';')));
}
