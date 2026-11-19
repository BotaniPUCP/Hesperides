/*
 * Genera los PNG de la app instalable a partir del ícono de marca (SPEC-120 D-06).
 * Uso, desde frontend/: node scripts/build-app-icons.mjs
 * Los PNG resultantes se commitean; este script solo se vuelve a correr si cambia el SVG.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const FRONTEND = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_SVG = path.join(FRONTEND, '..', 'docs', 'marca', 'iconos', 'hesperides-icono-app.svg');

/** Manifiesto (192, 512), favicon de Next (app/icon.png) e ícono de iPhone (180). */
const OUTPUTS = [
  { file: 'public/icons/icon-192.png', size: 192 },
  { file: 'public/icons/icon-512.png', size: 512 },
  { file: 'src/app/icon.png', size: 48 },
  { file: 'src/app/apple-icon.png', size: 180 },
];

const svg = readFileSync(SOURCE_SVG);

for (const { file, size } of OUTPUTS) {
  const target = path.join(FRONTEND, file);
  await sharp(svg, { density: 300 }).resize(size, size).png().toFile(target);
  console.log(`${file} (${size}x${size})`);
}
