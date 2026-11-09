import * as THREE from 'three';
import type { SceneData } from '../sceneData';
import { WORLD_LIFT } from './polyLayer';

type ScreenPoint = { x: number; y: number };

const SECTION_LAYERS = ['greenAreas', 'xerophytic', 'reserve'] as const;

function inRing(p: ScreenPoint, pts: ScreenPoint[]): boolean {
  let hit = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i], b = pts[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) hit = !hit;
  }
  return hit;
}

/** Áreas elegibles cuyo polígono cruza el rectángulo de pantalla (píxeles cliente). */
export function sectionCodesInScreenRect(
  data: SceneData, camera: THREE.PerspectiveCamera, canvasEl: HTMLCanvasElement,
  x1: number, y1: number, x2: number, y2: number, eligible: readonly string[],
): string[] {
  const allowed = new Set(eligible);
  const found = new Set<string>();
  const bounds = { left: Math.min(x1, x2), right: Math.max(x1, x2), top: Math.min(y1, y2), bottom: Math.max(y1, y2) };
  const canvas = canvasEl.getBoundingClientRect();
  camera.updateMatrixWorld();
  const project = (x: number, y: number): ScreenPoint => {
    const p = new THREE.Vector3(x, WORLD_LIFT + 0.8, -y).project(camera);
    return { x: canvas.left + (p.x + 1) * canvas.width / 2, y: canvas.top + (1 - p.y) * canvas.height / 2 };
  };
  const inside = (p: ScreenPoint) => p.x >= bounds.left && p.x <= bounds.right && p.y >= bounds.top && p.y <= bounds.bottom;
  const corners = [
    { x: bounds.left, y: bounds.top }, { x: bounds.right, y: bounds.top },
    { x: bounds.right, y: bounds.bottom }, { x: bounds.left, y: bounds.bottom },
  ];
  SECTION_LAYERS.forEach((id) => {
    for (const section of data[id]) {
      const code = section.props.code;
      if (!allowed.has(code) || found.has(code)) continue;
      const crosses = section.g.some((polygon) => {
        if (!polygon[0]) return false;
        const rings = polygon.map((ring) => {
          const pts: ScreenPoint[] = [];
          for (let i = 0; i < ring.length; i += 2) pts.push(project(ring[i], ring[i + 1]));
          return pts;
        });
        const outer = rings[0];
        if (outer.some(inside)) return true;
        // El rectángulo puede caer entero dentro del polígono sin contener ninguno de sus vértices.
        return corners.some((corner) => inRing(corner, outer) && !rings.slice(1).some((hole) => inRing(corner, hole)));
      });
      if (crosses) found.add(code);
    }
  });
  return [...found];
}
