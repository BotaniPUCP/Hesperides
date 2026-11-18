// Regenera src/components/map3d/realLook/looks/index.ts con todas las fichas de esa carpeta (SPEC-112 D-12).
// Uso, desde frontend/: node scripts/real-look-index.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const looks = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/components/map3d/realLook/looks');
const files = fs.readdirSync(looks).filter((name) => name.endsWith('.json')).sort();

/** `biblioteca-central.json` → `bibliotecaCentral`; un nombre que empieza con cifra lleva `_` delante. */
function identifier(file) {
  const camel = file.replace(/\.json$/, '').split(/[-_\s]+/).map((part, i) => (i ? part[0].toUpperCase() + part.slice(1) : part)).join('');
  return /^\d/.test(camel) ? `_${camel}` : camel;
}

const names = files.map(identifier);
const imports = files.map((file, i) => `import ${names[i]} from './${file}';`).join('\n');
const list = names.map((name) => `  ${name},`).join('\n');

fs.writeFileSync(path.join(looks, 'index.ts'), `import type { BuildingLook } from '../types';
${imports}

/**
 * Las fichas de apariencia de los edificios (SPEC-112). ARCHIVO GENERADO por
 * frontend/scripts/real-look-index.mjs desde los JSON de esta carpeta: no se edita a mano.
 * \`validateLooks\` las revisa al cargar y detiene el visor si una está mal escrita.
 */
const files: unknown[] = [
${list}
];

export const BUILDING_LOOKS = files as BuildingLook[];
`);
console.log(`${files.length} fichas en looks/index.ts`);
