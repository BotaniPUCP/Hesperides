import * as THREE from 'three';
import { buildStreets } from './cityStreets';
import { withCityWindows } from './cityWindows';
import { broadleafCrown, seeded } from './sunsetTrees';

/**
 * El entorno real del campus para el modo Atardecer: edificios, vías y áreas
 * verdes de OpenStreetMap (public/map/sunset/entorno.json, lo genera
 * scripts/mapa/entorno_osm.py). El mapeo de edificios de Lima en OSM es
 * incompleto: las manzanas vacías se rellenan con lotes de alturas variadas sobre
 * una grilla de ocupación que respeta calles, parques y edificios reales; y hay
 * árboles en las veredas y en los parques.
 */

export const CITY_URL = '/map/sunset/entorno.json';
/** Centro y radio del entorno: los de scripts/mapa/entorno_osm.py. */
export const CITY_ORIGIN = [-12.06984, -77.08043] as const;
export const CITY_RADIUS_M = 2500;

export interface CityData {
  origen: [number, number];
  radioM: number;
  /** [alto, x0, y0, x1, y1, …] en metros desde el origen (x al este, y al norte). */
  edificios: number[][];
  /** [ancho, x0, y0, …]. */
  vias: number[][];
  /** [x0, y0, …]. */
  verdes: number[][];
}

const CITY = {
  /** Celda de la grilla de ocupación y lado de un lote del relleno. */
  cellM: 6,
  lotM: 12,
  /** Margen de vereda a cada lado de una vía. */
  sidewalkM: 2.5,
  asphalt: '#34312e',
  park: '#46592f',
  buildings: ['#b38a6e', '#a77a60', '#c4b29a', '#b9b1a5', '#94664f', '#cdbfa8', '#8d847a', '#a99a86'],
  roofs: ['#6f6a64', '#7d6a5c', '#8a8178', '#5f5a55'],
  /** Árboles de calle: cada cuánto, en vías de este ancho o más. */
  streetTreeEveryM: 13,
  streetTreeMinWidthM: 8,
  parkTreePer100m2: 0.35,
} as const;

const FREE = 0, ROAD = 1, BUILT = 2, PARK = 3, CAMPUS = 4;

/** De las coordenadas del archivo a las de la escena (x al este, z al sur), con el origen del archivo en `offset`. */
type ToScene = (x: number, y: number) => [number, number];

function pointInRing(x: number, y: number, ring: number[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) {
    const xi = ring[i], yi = ring[i + 1], xj = ring[j], yj = ring[j + 1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function bounds(ring: number[]): [number, number, number, number] {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < ring.length; i += 2) {
    x0 = Math.min(x0, ring[i]); x1 = Math.max(x1, ring[i]);
    y0 = Math.min(y0, ring[i + 1]); y1 = Math.max(y1, ring[i + 1]);
  }
  return [x0, y0, x1, y1];
}

/** Grilla de ocupación sobre el círculo del entorno, en coordenadas del archivo. */
class Occupancy {
  readonly n: number;
  readonly cells: Uint8Array;
  constructor(readonly radius: number, readonly cell: number) {
    this.n = Math.ceil((2 * radius) / cell);
    this.cells = new Uint8Array(this.n * this.n);
  }
  index(x: number, y: number): number {
    const i = Math.floor((x + this.radius) / this.cell), j = Math.floor((y + this.radius) / this.cell);
    return i < 0 || j < 0 || i >= this.n || j >= this.n ? -1 : j * this.n + i;
  }
  get(x: number, y: number): number {
    const k = this.index(x, y);
    return k < 0 ? ROAD : this.cells[k];
  }
  /** Marca las celdas cuyo centro cae en el anillo (o cerca de un segmento, con `segment`). */
  fill(ring: number[], value: number) {
    const [x0, y0, x1, y1] = bounds(ring);
    for (let y = Math.floor(y0 / this.cell) * this.cell + this.cell / 2; y <= y1; y += this.cell) {
      for (let x = Math.floor(x0 / this.cell) * this.cell + this.cell / 2; x <= x1; x += this.cell) {
        const k = this.index(x, y);
        if (k >= 0 && this.cells[k] !== ROAD && pointInRing(x, y, ring)) this.cells[k] = value;
      }
    }
  }
  segment(ax: number, ay: number, bx: number, by: number, half: number, value: number) {
    const len = Math.hypot(bx - ax, by - ay);
    const steps = Math.max(1, Math.ceil(len / (this.cell * 0.5)));
    const r = Math.ceil(half / this.cell);
    for (let s = 0; s <= steps; s++) {
      const x = ax + ((bx - ax) * s) / steps, y = ay + ((by - ay) * s) / steps;
      for (let dj = -r; dj <= r; dj++) {
        for (let di = -r; di <= r; di++) {
          const cx = x + di * this.cell, cy = y + dj * this.cell;
          if (Math.hypot(cx - x, cy - y) > half + this.cell * 0.5) continue;
          const k = this.index(cx, cy);
          if (k >= 0) this.cells[k] = value;
        }
      }
    }
  }
}

/** Paredes y techo de un edificio, con su color por vértice. */
function pushBuilding(pos: number[], col: number[], ring: number[], h: number, wall: THREE.Color, roof: THREE.Color, at: ToScene, y0: number) {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i < ring.length; i += 2) {
    const [x, z] = at(ring[i], ring[i + 1]);
    pts.push(new THREE.Vector2(x, z));
  }
  if (pts.length < 3) return;
  const top = y0 + h;
  const tri = (a: number[], b: number[], c: number[], color: THREE.Color) => {
    pos.push(...a, ...b, ...c);
    for (let k = 0; k < 3; k++) col.push(color.r, color.g, color.b);
  };
  // Las paredes, algo más oscuras abajo: el contacto con la calle.
  const low = wall.clone().multiplyScalar(0.8);
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    pos.push(a.x, y0, a.y, b.x, y0, b.y, b.x, top, b.y, a.x, y0, a.y, b.x, top, b.y, a.x, top, a.y);
    [low, low, wall, low, wall, wall].forEach((c) => col.push(c.r, c.g, c.b));
  }
  for (const [i, j, k] of THREE.ShapeUtils.triangulateShape(pts, [])) {
    tri([pts[i].x, top, pts[i].y], [pts[j].x, top, pts[j].y], [pts[k].x, top, pts[k].y], roof);
  }
}

function meshFrom(pos: number[], col: number[] | null, material: THREE.Material): THREE.Mesh {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  if (col) geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, material);
  mesh.raycast = () => undefined;
  return mesh;
}

/**
 * Arma el entorno. `toScene` lleva coordenadas del archivo a la escena; `campus` son los anillos del
 * campus en coordenadas del archivo (allí no se pone nada); `groundY` es la cota de la calle.
 */
export function buildCity(data: CityData, toScene: ToScene, campus: number[][], groundY: number): THREE.Group {
  const group = new THREE.Group();
  const rnd = seeded(0xc17e);
  const grid = new Occupancy(data.radioM, CITY.cellM);
  campus.forEach((ring) => grid.fill(ring, CAMPUS));
  /** Dentro del campus no va nada de la ciudad, tampoco sus caminos internos de OSM. */
  const inCampus = (x: number, y: number) => campus.some((ring) => pointInRing(x, y, ring));
  const vias = data.vias
    .map((v) => {
      const keep: number[] = [v[0]];
      for (let i = 1; i < v.length; i += 2) if (!inCampus(v[i], v[i + 1])) keep.push(v[i], v[i + 1]);
      return keep;
    })
    .filter((v) => v.length >= 5);

  // Vías: cinta de asfalto, y en la grilla, la calle con sus veredas.
  const road: number[] = [];
  const up = groundY + 0.06;
  for (const v of vias) {
    const w = v[0];
    for (let i = 1; i + 3 < v.length; i += 2) {
      const [ax, ay, bx, by] = [v[i], v[i + 1], v[i + 2], v[i + 3]];
      grid.segment(ax, ay, bx, by, w / 2 + CITY.sidewalkM, ROAD);
      const len = Math.hypot(bx - ax, by - ay) || 1;
      const nx = (-(by - ay) / len) * (w / 2), ny = ((bx - ax) / len) * (w / 2);
      const [p1, p2, p3, p4] = [toScene(ax + nx, ay + ny), toScene(ax - nx, ay - ny), toScene(bx - nx, by - ny), toScene(bx + nx, by + ny)];
      road.push(p1[0], up, p1[1], p2[0], up, p2[1], p3[0], up, p3[1], p1[0], up, p1[1], p3[0], up, p3[1], p4[0], up, p4[1]);
    }
  }
  const asphalt = meshFrom(road, null, new THREE.MeshStandardMaterial({ color: CITY.asphalt, roughness: 0.95, side: THREE.DoubleSide }));
  asphalt.receiveShadow = true;
  group.add(asphalt);

  // Áreas verdes.
  const green: number[] = [];
  for (const ring of data.verdes) {
    grid.fill(ring, PARK);
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i < ring.length; i += 2) { const [x, z] = toScene(ring[i], ring[i + 1]); pts.push(new THREE.Vector2(x, z)); }
    for (const [i, j, k] of THREE.ShapeUtils.triangulateShape(pts, [])) {
      green.push(pts[i].x, up + 0.02, pts[i].y, pts[j].x, up + 0.02, pts[j].y, pts[k].x, up + 0.02, pts[k].y);
    }
  }
  const parks = meshFrom(green, null, new THREE.MeshStandardMaterial({ color: CITY.park, roughness: 1, side: THREE.DoubleSide }));
  parks.receiveShadow = true;
  group.add(parks);

  // Edificios de OSM.
  const pos: number[] = [], col: number[] = [];
  const pick = (list: readonly string[]) => new THREE.Color(list[Math.floor(rnd() * list.length)]);
  for (const b of data.edificios) {
    const ring = b.slice(1);
    grid.fill(ring, BUILT);
    pushBuilding(pos, col, ring, b[0], pick(CITY.buildings), pick(CITY.roofs), toScene, groundY);
  }

  // Relleno: un lote donde la grilla está libre; alturas por manzana, que cambian de a poco.
  const lots: [number, number, number][] = [];
  const half = CITY.lotM / 2;
  for (let y = -data.radioM + half; y < data.radioM; y += CITY.lotM) {
    for (let x = -data.radioM + half; x < data.radioM; x += CITY.lotM) {
      if (Math.hypot(x, y) > data.radioM - half) continue;
      const q = CITY.lotM / 4;
      if ([[-q, -q], [q, -q], [-q, q], [q, q]].some(([dx, dy]) => grid.get(x + dx, y + dy) !== FREE)) continue;
      const block = Math.sin(Math.floor(x / 60) * 12.9898 + Math.floor(y / 60) * 78.233) * 43758.5453;
      const floors = 1 + Math.floor((block - Math.floor(block)) * 3 + rnd() * 1.6);
      lots.push([x, y, floors * 3 + rnd() * 1.2]);
    }
  }
  const box = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const lotMesh = new THREE.InstancedMesh(box, withCityWindows(new THREE.MeshStandardMaterial({ roughness: 0.9 }), groundY), lots.length);
  const m = new THREE.Matrix4(), s = new THREE.Vector3(), p = new THREE.Vector3(), qn = new THREE.Quaternion();
  lots.forEach(([x, y, h], k) => {
    const [sx, sz] = toScene(x, y);
    const w = CITY.lotM * (0.86 + rnd() * 0.12);
    m.compose(p.set(sx, groundY, sz), qn, s.set(w, h, w));
    lotMesh.setMatrixAt(k, m);
    lotMesh.setColorAt(k, pick(CITY.buildings).multiplyScalar(0.92));
  });
  lotMesh.castShadow = true;
  lotMesh.receiveShadow = true;
  lotMesh.raycast = () => undefined;
  group.add(lotMesh);

  const built = meshFrom(pos, col, withCityWindows(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide }), groundY));
  built.castShadow = true;
  built.receiveShadow = true;
  group.add(built);

  // Árboles: en las veredas de las vías anchas y dentro de los parques.
  const trees: [number, number, number][] = [];
  for (const v of vias) {
    if (v[0] < CITY.streetTreeMinWidthM) continue;
    for (let i = 1; i + 3 < v.length; i += 2) {
      const [ax, ay, bx, by] = [v[i], v[i + 1], v[i + 2], v[i + 3]];
      const len = Math.hypot(bx - ax, by - ay);
      const nx = -(by - ay) / (len || 1), ny = (bx - ax) / (len || 1);
      for (let t = rnd() * CITY.streetTreeEveryM; t < len; t += CITY.streetTreeEveryM) {
        for (const side of [-1, 1]) {
          const off = v[0] / 2 + CITY.sidewalkM * 0.6;
          const x = ax + ((bx - ax) * t) / len + nx * off * side, y = ay + ((by - ay) * t) / len + ny * off * side;
          if (grid.get(x, y) === CAMPUS || Math.hypot(x, y) > data.radioM) continue;
          trees.push([x, y, 2.6 + rnd() * 1.8]);
        }
      }
    }
  }
  for (const ring of data.verdes) {
    const [x0, y0, x1, y1] = bounds(ring);
    const n = Math.round(((x1 - x0) * (y1 - y0) * CITY.parkTreePer100m2) / 100 * 0.6);
    for (let k = 0; k < n; k++) {
      const x = x0 + rnd() * (x1 - x0), y = y0 + rnd() * (y1 - y0);
      if (pointInRing(x, y, ring)) trees.push([x, y, 3 + rnd() * 3]);
    }
  }
  const crown = new THREE.InstancedMesh(broadleafCrown(0x7ee5, 0, 4),
    new THREE.MeshStandardMaterial({ color: '#4a6532', roughness: 1, vertexColors: true }), trees.length);
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.2, 1, 5).translate(0, 0.5, 0),
    new THREE.MeshStandardMaterial({ color: '#4d3d30', roughness: 1 }), trees.length);
  trees.forEach(([x, y, r], k) => {
    const [sx, sz] = toScene(x, y);
    const h = r * 1.9;
    m.compose(p.set(sx, groundY + h - r * 0.8, sz), qn.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * 6.28), s.set(r, r * 0.9, r));
    crown.setMatrixAt(k, m);
    m.compose(p.set(sx, groundY, sz), qn, s.set(r, h - r * 0.8, r));
    trunk.setMatrixAt(k, m);
    crown.setColorAt(k, new THREE.Color(1, 1, 1).multiplyScalar(0.8 + rnd() * 0.35));
  });
  // Son decenas de miles y se ven de lejos: sin sombra propia (el mapa de sombras no recorta instancias).
  [crown, trunk].forEach((mesh) => { mesh.raycast = () => undefined; group.add(mesh); });
  const streets = buildStreets(vias, toScene, (x, y) => inCampus(x, y) || Math.hypot(x, y) > data.radioM, groundY);
  group.add(streets);
  group.userData.counts = { osm: data.edificios.length, lots: lots.length, trees: trees.length, roads: vias.length, ...streets.userData.counts };
  return group;
}
