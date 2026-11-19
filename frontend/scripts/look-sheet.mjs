// Hoja de revisión de una ficha de apariencia (SPEC-112 D-11): las fotos del edificio arriba y, abajo, el edificio
// pintado con su ficha desde cada lado a la altura de una persona y desde el aire. Lleva fotos con personas: se
// escribe fuera del repositorio y no se versiona.
// Uso, desde frontend/:
//   node --import ./scripts/ts-register.mjs scripts/look-sheet.mjs <ficha.json> --salida <carpeta>
//     [--fotos <carpeta edificios-pucp>] [--referencias <carpeta con imágenes>] [--cuadricula] [--medidas]
// --medidas imprime los paños de muro de cada cara (tramo de u y de cota, área) para ubicar las regiones.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { render } from './look-sheet/raster.mjs';
import { boxCenter, classifiedBuilding, loadCampus, wallSegments } from './look-sheet/scene.mjs';

const frontend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const map3d = (file) => import(pathToFileURL(path.join(frontend, 'src/components/map3d', file)).href);

const VIEW = { w: 640, h: 400, fov: 38 };
const SHEET_W = VIEW.w * 3;
const PHOTO_H = 260;
const CAPTION_H = 22;
const PERSON_M = 1.7;
/** La distancia con que el mapa encuadra un edificio (FOCUS_MIN_DISTANCE_M de cameraRig). */
const FRAMING_M = 230;
const IMAGE = /\.(jpe?g|png|webp)$/i;

function parseArgs(argv) {
  const out = { grid: false };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === '--cuadricula') out.grid = true;
    else if (flag === '--medidas') out.measures = true;
    else if (flag === '--fotos') out.photos = argv[++i];
    else if (flag === '--salida') out.out = argv[++i];
    else if (flag === '--referencias') out.refs = argv[++i];
    else out.look = flag;
  }
  if (!out.look || !out.out) throw new Error('Uso: look-sheet.mjs <ficha.json> --salida <carpeta> [--fotos <edificios-pucp>] [--referencias <carpeta>] [--cuadricula]');
  return out;
}

function bounds(p) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < p.length; i++) { min[i % 3] = Math.min(min[i % 3], p[i]); max[i % 3] = Math.max(max[i % 3], p[i]); }
  return { min, max, center: min.map((m, k) => (m + max[k]) / 2), size: min.map((m, k) => max[k] - m) };
}

/** Desde cada lado a la altura de una persona, desde el aire de cerca y como lo encuadra el mapa. */
function views(positions) {
  const b = bounds(positions);
  const [sx, h, sz] = b.size, c = b.center;
  const tanH = Math.tan((VIEW.fov * Math.PI) / 360), aspect = VIEW.w / VIEW.h;
  const target = [c[0], b.min[1] + h * 0.45, c[2]];
  const back = (span, depth) => Math.max((span * 0.6) / (tanH * aspect), (h * 0.6) / tanH) + depth / 2;
  const orbit = (azimuth, elevation, dist) => {
    const az = (azimuth * Math.PI) / 180, el = (elevation * Math.PI) / 180;
    return [c[0] + dist * Math.cos(el) * Math.sin(az), c[1] + dist * Math.sin(el), c[2] - dist * Math.cos(el) * Math.cos(az)];
  };
  const close = Math.max(60, (1.3 * Math.max(sx, sz, h)) / tanH);
  return [
    { name: 'desde el norte', eye: [c[0], PERSON_M, c[2] - back(sx, sz)], target },
    { name: 'desde el este', eye: [c[0] + back(sz, sx), PERSON_M, c[2]], target },
    { name: 'desde el sur', eye: [c[0], PERSON_M, c[2] + back(sx, sz)], target },
    { name: 'desde el oeste', eye: [c[0] - back(sz, sx), PERSON_M, c[2]], target },
    { name: 'desde el aire, al noreste', eye: orbit(45, 35, close), target: c },
    { name: `como lo encuadra el mapa (${FRAMING_M} m), al suroeste`, eye: orbit(225, 35, FRAMING_M), target: c },
  ];
}

const escapeXml = (s) => s.replace(/[<>&"]/g, (ch) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[ch]);
const caption = (text, w, size = 14) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${size + 8}">`
  + `<rect width="100%" height="100%" fill="white"/><text x="6" y="${size + 2}" font-family="Segoe UI, Arial" font-size="${size}" fill="#333">${escapeXml(text)}</text></svg>`);

function photoFiles(look, opts) {
  const dir = opts.refs ?? (opts.photos && look.folder ? path.join(opts.photos, look.folder) : null);
  if (!dir || !fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((name) => IMAGE.test(name)).sort().map((name) => path.join(dir, name));
}

/** Las fotos en filas del ancho de la hoja, cada una con su nombre debajo. */
async function photoTiles(files, top) {
  const tiles = [];
  let x = 0, y = top;
  for (const file of files) {
    const image = await sharp(file).rotate().resize({ height: PHOTO_H }).png().toBuffer({ resolveWithObject: true });
    const w = Math.min(image.info.width, SHEET_W);
    if (x + w > SHEET_W) { x = 0; y += PHOTO_H + CAPTION_H; }
    tiles.push({ input: image.data, left: x, top: y }, { input: caption(path.basename(file), w, 12), left: x, top: y + PHOTO_H });
    x += w;
  }
  return { tiles, bottom: files.length ? y + PHOTO_H + CAPTION_H : top };
}

const round = (x) => Math.round(x * 10) / 10;

function printSegments(building, segments) {
  const box = boxCenter(building.positions);
  console.log(`caja: ${round(box.eastWest)} m de este a oeste, ${round(box.northSouth)} m de norte a sur, hasta la cota ${round(box.top)}`);
  console.log('cada paño: zona y cara, distancia al centro, tramo de u (crece a la derecha de quien mira la cara), cota y área');
  segments.filter((s) => s.area >= 2).forEach((s) => console.log(
    `${s.name.padEnd(28)} a ${String(s.depth).padStart(3)} m  u ${round(s.u[0])} … ${round(s.u[1])}  v ${round(s.v[0])} … ${round(s.v[1])}  ${Math.round(s.area)} m²`));
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const [{ LocalPlane }, { polygons }, { buildLookTable }, { classifyBuilding }, { facadeColor }, { validateLooks }, { adjustmentsOf, adjusted, adjustedRing, liftsOf, lifted }, { stairsOf, withStair }, { piecesOf, splitPiece }] = await Promise.all(
    ['projection.ts', 'sceneData.ts', 'realLook/lookTable.ts', 'realLook/classifyFaces.ts', 'realLook/facadeColor.ts', 'realLook/validateLook.ts', 'viewer/adjustments.ts', 'viewer/stairs.ts', 'viewer/pieces.ts'].map(map3d));
  const look = JSON.parse(fs.readFileSync(opts.look, 'utf8'));
  const campus = loadCampus(path.resolve(frontend, '..'));
  // Las mallas de edificio son los nodos del GLB y las piezas que el manifiesto separa de ellos (SPEC-108 D-18).
  const meshes = [...Object.entries(campus.manifest.nodes).filter(([, kind]) => kind === 'edificio').map(([key]) => key), ...piecesOf(campus.manifest).keys()];
  validateLooks([look], new Set(meshes));
  const building = classifiedBuilding(campus, look, { LocalPlane, polygons, buildLookTable, classifyBuilding, adjustmentsOf, adjusted, adjustedRing, liftsOf, lifted, stairsOf, withStair, piecesOf, splitPiece });
  if (opts.measures) printSegments(building, wallSegments(building, look));
  const title = { input: caption(`${look.name} · ${look.planKey}`, SHEET_W, 20), left: 0, top: 0 };
  const photos = await photoTiles(photoFiles(look, opts), 32);
  const renders = await Promise.all(views(building.positions).map(async (view, i) => {
    const raw = render(building, { ...view, ...VIEW, grid: opts.grid }, facadeColor);
    const left = (i % 3) * VIEW.w, top = photos.bottom + 8 + Math.floor(i / 3) * (VIEW.h + CAPTION_H);
    const png = await sharp(Buffer.from(raw), { raw: { width: VIEW.w, height: VIEW.h, channels: 3 } }).png().toBuffer();
    return [{ input: png, left, top }, { input: caption(view.name, VIEW.w), left, top: top + VIEW.h }];
  }));
  const height = photos.bottom + 8 + 2 * (VIEW.h + CAPTION_H);
  fs.mkdirSync(opts.out, { recursive: true });
  const file = path.join(opts.out, `${path.basename(opts.look, '.json')}${opts.grid ? '-cuadricula' : ''}.png`);
  await sharp({ create: { width: SHEET_W, height, channels: 3, background: '#ffffff' } })
    .composite([title, ...photos.tiles, ...renders.flat()]).png().toFile(file);
  console.log(file);
}

await main();
