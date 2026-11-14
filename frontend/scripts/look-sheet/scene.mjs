// Un edificio del modelo del campus clasificado con su ficha, igual que en el visor (SPEC-112 D-11): las mismas
// mallas, las mismas huellas (las de V045, corridas por V053) y las mismas funciones de realLook. El marco es el del modelo: metros
// alrededor del anclaje, x este, y arriba, z = −norte; el visor solo lo corre en planta, y eso no cambia ni la u
// (medida desde el centro de la caja) ni la v (la cota).
import fs from 'node:fs';
import path from 'node:path';

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/;

/** Posiciones sin índice de cada nodo del GLB, por nombre. El modelo del campus no trae transformaciones. */
export function readGlbNodes(buffer) {
  const jsonLength = buffer.readUInt32LE(12);
  const json = JSON.parse(buffer.toString('utf8', 20, 20 + jsonLength));
  const bin = 20 + jsonLength + 8;
  const nodes = new Map();
  for (const node of json.nodes ?? []) {
    if (node.mesh === undefined || !node.name) continue;
    const parts = json.meshes[node.mesh].primitives.map((p) => primitivePositions(json, buffer, bin, p));
    nodes.set(node.name, concat(parts));
  }
  return nodes;
}

function accessorValues(json, buffer, bin, index, width, read) {
  const acc = json.accessors[index];
  const view = json.bufferViews[acc.bufferView];
  const size = { 5121: 1, 5123: 2, 5125: 4, 5126: 4 }[acc.componentType];
  const stride = view.byteStride ?? size * width;
  const start = bin + (view.byteOffset ?? 0) + (acc.byteOffset ?? 0);
  return Array.from({ length: acc.count * width }, (_, i) => read(start + Math.floor(i / width) * stride + (i % width) * size, acc.componentType));
}

function primitivePositions(json, buffer, bin, primitive) {
  const p = accessorValues(json, buffer, bin, primitive.attributes.POSITION, 3, (at) => buffer.readFloatLE(at));
  if (primitive.indices === undefined) return Float32Array.from(p);
  const readIndex = (at, type) => (type === 5125 ? buffer.readUInt32LE(at) : type === 5123 ? buffer.readUInt16LE(at) : buffer.readUInt8(at));
  const idx = accessorValues(json, buffer, bin, primitive.indices, 1, readIndex);
  return Float32Array.from(idx.flatMap((i) => [p[i * 3], p[i * 3 + 1], p[i * 3 + 2]]));
}

function concat(arrays) {
  const out = new Float32Array(arrays.reduce((n, a) => n + a.length, 0));
  let at = 0;
  arrays.forEach((a) => { out.set(a, at); at += a.length; });
  return out;
}

/** En V045, el UPDATE o la fila del INSERT de un edificio cuya geometría es del SKP. */
const FROM_THE_PLAN = /source = 'PUCP'|^\s*\('PUCP'/;

/** La huella GeoJSON (lat/lon) de cada plan_key, tal como la deja V045, y si es del SKP o de OpenStreetMap. */
export function footprintsOfV045(sql) {
  const out = new Map();
  // Por línea y no por sentencia: el INSERT de los principales nuevos trae una fila por línea, cada una con
  // su plan_key, su huella y su fuente; los UPDATE también las traen en la misma línea.
  for (const line of sql.split('\n')) {
    const key = line.match(UUID)?.[0];
    const geojson = line.match(/ST_GeomFromGeoJSON\('(\{[^']*\})'\)/)?.[1];
    if (key && geojson && !out.has(key)) out.set(key, { geojson: JSON.parse(geojson), fromThePlan: FROM_THE_PLAN.test(line) });
  }
  return out;
}

/**
 * Los grados que V053 corre hacia los jardines (14 nov 2026) las huellas del SKP, y los plan_key que nombra
 * aparte: los de OpenStreetMap que el visor dibuja con una malla del GLB, como la caseta del edificio 95.
 */
export function shiftOfV053(sql) {
  const degrees = sql.match(/ST_Translate\(footprint, (-?\d+(?:\.\d+)?), (-?\d+(?:\.\d+)?)\)/);
  if (!degrees) throw new Error('V053 ya no trae el ST_Translate de las huellas del plano: la hoja las ubicaría mal');
  const planKeys = [...sql.matchAll(/plan_key = '([^']+)'/g)].map((m) => m[1]);
  return { dLon: Number(degrees[1]), dLat: Number(degrees[2]), planKeys };
}

/** Las huellas como quedan en la base tras V053: las del SKP y las que nombra, corridas; las demás, igual. */
export function footprintsAfterV053(footprints, { dLon, dLat, planKeys }) {
  const move = (c) => (typeof c[0] === 'number' ? [c[0] + dLon, c[1] + dLat] : c.map(move));
  return new Map([...footprints].map(([key, { geojson, fromThePlan }]) =>
    [key, fromThePlan || planKeys.includes(key) ? { ...geojson, coordinates: move(geojson.coordinates) } : geojson]));
}

/** Lee el modelo, el manifiesto y las huellas del repositorio; `realLook` son los módulos del visor ya importados. */
export function loadCampus(repoRoot) {
  const mapa = path.join(repoRoot, 'backend/src/main/resources/mapa');
  const migrations = path.join(repoRoot, 'backend/src/main/resources/db/migration');
  const manifest = JSON.parse(fs.readFileSync(path.join(mapa, 'edificios-plano.json'), 'utf8'));
  const nodes = readGlbNodes(fs.readFileSync(path.join(mapa, 'edificios-plano.glb')));
  const v045 = fs.readFileSync(path.join(migrations, 'V045__group_buildings_by_plan.sql'), 'utf8');
  const v053 = fs.readFileSync(path.join(migrations, 'V053__shift_plan_footprints_to_gardens.sql'), 'utf8');
  return { manifest, nodes, footprints: footprintsAfterV053(footprintsOfV045(v045), shiftOfV053(v053)) };
}

/** De cada texel de cara, su zona y orientación: la tabla da uno distinto a cada una. */
function faceNames(table, look) {
  const names = new Map();
  table.zones.get(look.planKey).forEach((zone, i) => {
    Object.entries(zone.sides).forEach(([side, texel]) => names.set(texel, `${look.zones[i].id} ${side}`));
  });
  return names;
}

/** El centro de la caja en planta: de ahí se mide la u (classifyFaces) y la distancia de cada paño. */
export function boxCenter(p) {
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < p.length; i += 3) {
    x0 = Math.min(x0, p[i]); x1 = Math.max(x1, p[i]); z0 = Math.min(z0, p[i + 2]); z1 = Math.max(z1, p[i + 2]); y1 = Math.max(y1, p[i + 1]);
  }
  return { cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, eastWest: x1 - x0, northSouth: z1 - z0, top: y1 };
}

/**
 * Los paños de muro de cada cara (zona y orientación), separados por su distancia al centro en la dirección de
 * la cara: tramo de u, de cota y área. Con esto se ubican las regiones en metros sin adivinar en la imagen.
 */
export function wallSegments(building, look) {
  const names = faceNames(building.table, look);
  const p = building.positions, f = building.face;
  const { cx, cz } = boxCenter(p);
  const groups = new Map();
  for (let t = 0; t < p.length / 9; t++) {
    const name = names.get(building.row[t * 3]);
    if (!name) continue;
    const at = (k, i) => p[(t * 3 + k) * 3 + i];
    const ex = [at(1, 0) - at(0, 0), at(1, 1) - at(0, 1), at(1, 2) - at(0, 2)], ey = [at(2, 0) - at(0, 0), at(2, 1) - at(0, 1), at(2, 2) - at(0, 2)];
    const n = [ex[1] * ey[2] - ex[2] * ey[1], ex[2] * ey[0] - ex[0] * ey[2], ex[0] * ey[1] - ex[1] * ey[0]];
    const area = Math.hypot(...n) / 2, h = Math.hypot(n[0], n[2]) || 1;
    const depth = Math.abs(((at(0, 0) - cx) * n[0] + (at(0, 2) - cz) * n[2]) / h);
    const key = `${name} @${Math.round(depth)}`;
    const g = groups.get(key) ?? { name, depth: Math.round(depth), u: [Infinity, -Infinity], v: [Infinity, -Infinity], area: 0 };
    for (let k = 0; k < 3; k++) {
      const u = f[(t * 3 + k) * 2], v = f[(t * 3 + k) * 2 + 1];
      g.u = [Math.min(g.u[0], u), Math.max(g.u[1], u)];
      g.v = [Math.min(g.v[0], v), Math.max(g.v[1], v)];
    }
    g.area += area;
    groups.set(key, g);
  }
  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name) || b.area - a.area);
}

/** Clasifica el edificio de la ficha como el visor: fila de la tabla y (u, v) por vértice. */
export function classifiedBuilding(campus, look, realLook) {
  const { LocalPlane, polygons, buildLookTable, classifyBuilding, adjustmentsOf, adjusted, adjustedRing, stairsOf, withStair } = realLook;
  const raw = campus.nodes.get(look.planKey);
  if (!raw?.length) throw new Error(`El modelo no tiene malla para ${look.planKey} (${look.name})`);
  const geojson = campus.footprints.get(look.planKey);
  if (!geojson) throw new Error(`V045 no trae la huella de ${look.planKey} (${look.name})`);
  // El anclaje del manifiesto ya está corrido (14 nov 2026): con las huellas de V045 sin V053, la malla y su
  // huella quedarían 3,7 m una de otra y las caras se clasificarían contra un contorno ajeno.
  const plane = new LocalPlane(campus.manifest.anchor.lat, campus.manifest.anchor.lon);
  // Con un ajuste del manifiesto (SPEC-108 D-16), malla y huella se mueven y estiran juntas, como en el visor y en V054.
  const m = adjustmentsOf(campus.manifest).get(look.planKey);
  const fitted = m ? adjusted(raw, m) : raw;
  // Con una escalera (D-17), la malla pierde el bloque que la escalera reemplaza y la suma al final, sin fachada.
  const stair = stairsOf(campus.manifest).get(look.planKey);
  const { positions, stairFrom } = stair ? withStair(fitted, stair, look.planKey) : { positions: fitted, stairFrom: fitted.length / 3 };
  const footprint = polygons(geojson, plane).map((poly) => (m ? poly.map((ring) => adjustedRing(ring, m)) : poly));
  const table = buildLookTable([look]);
  const n = positions.length / 3;
  const out = { row: new Float32Array(n).fill(-1), face: new Float32Array(n * 2) };
  classifyBuilding(positions, 0, n, footprint, table.zones.get(look.planKey), out, stairFrom);
  return { positions, row: out.row, face: out.face, table };
}
