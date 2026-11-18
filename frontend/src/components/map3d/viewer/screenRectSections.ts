import * as THREE from 'three';
import type { Ring, SceneData } from '../sceneData';
import { insideRing } from './picking';
import { WORLD_LIFT } from './polyLayer';

type ScreenPoint = { x: number; y: number };
/** `behind`: el punto está detrás de la cámara; su proyección sale reflejada y no sirve. */
type Projected = ScreenPoint & { behind: boolean };
type Bounds = { left: number; right: number; top: number; bottom: number };

const SECTION_LAYERS = ['greenAreas', 'xerophytic', 'reserve'] as const;
/** Cuánto del jardín tiene que quedar dentro del rectángulo para elegirlo. */
const MIN_SHARE_INSIDE = 0.5;

function projector(camera: THREE.PerspectiveCamera, canvasEl: HTMLCanvasElement) {
  const canvas = canvasEl.getBoundingClientRect();
  camera.updateMatrixWorld();
  return (x: number, y: number): Projected => {
    const p = new THREE.Vector3(x, WORLD_LIFT + 0.8, -y).project(camera);
    return { x: canvas.left + (p.x + 1) * canvas.width / 2, y: canvas.top + (1 - p.y) * canvas.height / 2, behind: p.z > 1 };
  };
}

function toBounds(x1: number, y1: number, x2: number, y2: number): Bounds {
  return { left: Math.min(x1, x2), right: Math.max(x1, x2), top: Math.min(y1, y2), bottom: Math.max(y1, y2) };
}

/** Área de un anillo en pantalla (fórmula del cordón), sin signo. */
export function ringArea(pts: readonly ScreenPoint[]): number {
  let twice = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) twice += (pts[j].x + pts[i].x) * (pts[j].y - pts[i].y);
  return Math.abs(twice) / 2;
}

/** Recorta un anillo al rectángulo (Sutherland–Hodgman); sirve también con anillos cóncavos para medir el área. */
export function clipRing(pts: readonly ScreenPoint[], b: Bounds): ScreenPoint[] {
  const edges: [(p: ScreenPoint) => boolean, (a: ScreenPoint, c: ScreenPoint) => ScreenPoint][] = [
    [(p) => p.x >= b.left, (a, c) => ({ x: b.left, y: a.y + (c.y - a.y) * (b.left - a.x) / (c.x - a.x) })],
    [(p) => p.x <= b.right, (a, c) => ({ x: b.right, y: a.y + (c.y - a.y) * (b.right - a.x) / (c.x - a.x) })],
    [(p) => p.y >= b.top, (a, c) => ({ x: a.x + (c.x - a.x) * (b.top - a.y) / (c.y - a.y), y: b.top })],
    [(p) => p.y <= b.bottom, (a, c) => ({ x: a.x + (c.x - a.x) * (b.bottom - a.y) / (c.y - a.y), y: b.bottom })],
  ];
  let out = [...pts];
  for (const [keep, cut] of edges) {
    const input = out;
    out = [];
    for (let i = 0; i < input.length; i++) {
      const cur = input[i], prev = input[(i + input.length - 1) % input.length];
      if (keep(cur)) {
        if (!keep(prev)) out.push(cut(prev, cur));
        out.push(cur);
      } else if (keep(prev)) out.push(cut(prev, cur));
    }
    if (!out.length) break;
  }
  return out;
}

/**
 * Si un jardín, ya proyectado en pantalla, cuenta como encerrado: queda dentro al menos la mitad de
 * él, o el rectángulo cae casi entero sobre él (un clic o un rectángulo chico dentro de un jardín
 * grande). Que solo asome un borde o una esquina, como pasa con los vecinos, no basta.
 */
export function sectionInRect(polygons: readonly (readonly ScreenPoint[][])[], b: Bounds): boolean {
  let area = 0, inside = 0;
  for (const rings of polygons) {
    rings.forEach((ring, n) => {
      const sign = n === 0 ? 1 : -1;
      area += sign * ringArea(ring);
      inside += sign * ringArea(clipRing(ring, b));
    });
  }
  if (area <= 0 || inside <= 0) return false;
  const rectArea = (b.right - b.left) * (b.bottom - b.top);
  return inside >= area * MIN_SHARE_INSIDE || inside > rectArea * MIN_SHARE_INSIDE;
}

/** Ejemplares elegibles cuyo punto cae dentro del rectángulo de pantalla (píxeles cliente). */
export function specimenCodesInScreenRect(
  data: SceneData, camera: THREE.PerspectiveCamera, canvasEl: HTMLCanvasElement,
  x1: number, y1: number, x2: number, y2: number, eligible: readonly string[],
): string[] {
  const allowed = new Set(eligible);
  const project = projector(camera, canvasEl);
  const b = toBounds(x1, y1, x2, y2);
  return data.vegetation.filter((plant) => {
    if (!allowed.has(plant.props.code)) return false;
    const p = project(plant.p[0], plant.p[1]);
    return !p.behind && p.x >= b.left && p.x <= b.right && p.y >= b.top && p.y <= b.bottom;
  }).map((plant) => plant.props.code);
}

type Box = { minX: number; maxX: number; minY: number; maxY: number };

function boxOf(polygons: readonly Ring[][]): Box {
  const box = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
  for (const polygon of polygons) {
    const outer = polygon[0] ?? [];
    for (let i = 0; i < outer.length; i += 2) {
      box.minX = Math.min(box.minX, outer[i]); box.maxX = Math.max(box.maxX, outer[i]);
      box.minY = Math.min(box.minY, outer[i + 1]); box.maxY = Math.max(box.maxY, outer[i + 1]);
    }
  }
  return box;
}

const inPolygons = (x: number, y: number, polygons: readonly Ring[][]) =>
  polygons.some((p) => p[0] && insideRing(x, y, p[0]) && !p.slice(1).some((hole) => insideRing(x, y, hole)));

/** Lo que se toma de cada jardín para medir cuánto queda bajo techo. */
const SAMPLES_PER_SIDE = 12;

/**
 * Los jardines que quedan en su mayor parte bajo la planta de un edificio: jardineras y patios
 * interiores que la silueta no recorta, y que en el mapa no se ven. El rectángulo no los elige
 * aunque los encierre; se siguen pudiendo elegir desde la lista. Un edificio hundido, cuyo techo
 * no pasa del suelo (como un auditorio bajo el césped), no tapa lo que está encima.
 * `defaultHeightM` es la altura con que se dibuja un edificio sin dato, como en sceneLayers.
 */
export function sectionsUnderBuildings(data: SceneData, defaultHeightM = 8): Set<string> {
  const roofs = [...data.campusBuildings, ...data.contextBuildings]
    .filter((b) => (b.props.baseM ?? 0) + (b.props.heightM ?? defaultHeightM) > 0.5)
    .map((b) => ({ g: b.g, box: boxOf(b.g) }));
  const hidden = new Set<string>();
  SECTION_LAYERS.forEach((id) => {
    for (const section of data[id]) {
      const box = boxOf(section.g);
      const near = roofs.filter((r) => r.box.minX <= box.maxX && r.box.maxX >= box.minX && r.box.minY <= box.maxY && r.box.maxY >= box.minY);
      if (!near.length) continue;
      let inside = 0, covered = 0;
      const dx = (box.maxX - box.minX) / SAMPLES_PER_SIDE, dy = (box.maxY - box.minY) / SAMPLES_PER_SIDE;
      for (let i = 0; i < SAMPLES_PER_SIDE; i++) {
        for (let j = 0; j < SAMPLES_PER_SIDE; j++) {
          const x = box.minX + (i + 0.5) * dx, y = box.minY + (j + 0.5) * dy;
          if (!inPolygons(x, y, section.g)) continue;
          inside++;
          if (near.some((r) => inPolygons(x, y, r.g))) covered++;
        }
      }
      if (inside > 0 && covered >= inside * MIN_SHARE_INSIDE) hidden.add(section.props.code);
    }
  });
  return hidden;
}

/** Se mide una vez por escena, al primer rectángulo: el mapa general nunca lo usa. */
const hiddenByScene = new WeakMap<SceneData, Set<string>>();
function hiddenSectionsOf(data: SceneData): Set<string> {
  let hidden = hiddenByScene.get(data);
  if (!hidden) hiddenByScene.set(data, hidden = sectionsUnderBuildings(data));
  return hidden;
}

/**
 * Áreas elegibles que el rectángulo de pantalla (píxeles cliente) encierra, según {@link sectionInRect};
 * `hidden` son las que no se ven y no se eligen así (por omisión, {@link sectionsUnderBuildings}).
 */
export function sectionCodesInScreenRect(
  data: SceneData, camera: THREE.PerspectiveCamera, canvasEl: HTMLCanvasElement,
  x1: number, y1: number, x2: number, y2: number, eligible: readonly string[], hidden: ReadonlySet<string> = hiddenSectionsOf(data),
): string[] {
  const allowed = new Set(eligible.filter((code) => !hidden.has(code)));
  const found = new Set<string>();
  const b = toBounds(x1, y1, x2, y2);
  const project = projector(camera, canvasEl);
  SECTION_LAYERS.forEach((id) => {
    for (const section of data[id]) {
      const code = section.props.code;
      if (!allowed.has(code) || found.has(code)) continue;
      let behind = false;
      const polygons = section.g.filter((polygon) => polygon[0]).map((polygon) => polygon.map((ring) => {
        const pts: ScreenPoint[] = [];
        for (let i = 0; i < ring.length; i += 2) {
          const p = project(ring[i], ring[i + 1]);
          behind ||= p.behind;
          pts.push(p);
        }
        return pts;
      }));
      // Un jardín que se extiende detrás de la cámara no se puede encerrar en pantalla.
      if (!behind && sectionInRect(polygons, b)) found.add(code);
    }
  });
  return [...found];
}
