import type { BuildingModelManifest, FloorSteps } from '@shared/types';
import type { PlanNode } from './planModel';
import { inPlanPolygon, isPlanPoint } from './planPolygon';
import { stepTriangle, type P3 } from './rampSteps';

/**
 * Rampas del piso del modelo que en realidad son escaleras (SPEC-108 D-20): el SKP dibuja como un plano inclinado
 * lo que tiene escalones. El visor escalona las caras inclinadas de cada rampa del manifiesto; el GLB no se toca.
 */

/** Una cara entre estas pendientes es rampa: más plana es piso; más empinada, muro o grada. */
const MIN_RAMP_DEG = 2;
const MAX_RAMP_DEG = 40;
/** Una cota a menos de esto de las del manifiesto cae dentro: el manifiesto redondea al centímetro. */
const HEIGHT_TOLERANCE_M = 0.01;

function validate(key: string, s: FloorSteps): void {
  if (!Array.isArray(s.polygon) || s.polygon.length < 3 || !s.polygon.every(isPlanPoint)) throw new Error(`El polígono de los escalones ${key} necesita tres o más puntos de dos números finitos`);
  if (!(s.toM > s.fromM)) throw new Error(`La rampa de los escalones ${key} no sube`);
  if (!Number.isInteger(s.risers) || s.risers < 2) throw new Error(`Los escalones ${key} necesitan dos o más contrahuellas enteras`);
}

/** Los escalones del manifiesto, validados. */
export function floorStepsOf(manifest: BuildingModelManifest): Map<string, FloorSteps> {
  const out = new Map<string, FloorSteps>();
  for (const [key, steps] of Object.entries(manifest.floorSteps ?? {})) {
    validate(key, steps);
    out.set(key, steps);
  }
  return out;
}

/** Un triángulo del modelo (x este, y arriba, z = −norte) como puntos [este, norte, cota]. */
const triangleAt = (p: Float32Array, t: number): P3[] => [0, 3, 6].map((o): P3 => [p[t + o], -p[t + o + 2], p[t + o + 1]]);

function slopeDeg([a, b, c]: P3[]): number | null {
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
  const length = Math.hypot(n[0], n[1], n[2]);
  return length > 0 && n[2] > 0 ? (Math.acos(n[2] / length) * 180) / Math.PI : null;
}

/**
 * La rampa del manifiesto que toma el triángulo: inclinado, con su centro en el polígono y sin pasarse de sus cotas.
 * Cuenta el centro y no los tres vértices porque el SKP tiende triángulos de un borde a otro de la rampa.
 */
function stepsFor(tri: P3[], steps: [string, FloorSteps, (e: number, n: number) => boolean][]) {
  const slope = slopeDeg(tri);
  if (slope === null || slope < MIN_RAMP_DEG || slope > MAX_RAMP_DEG) return undefined;
  const [e, n] = [0, 1].map((k) => (tri[0][k] + tri[1][k] + tri[2][k]) / 3);
  return steps.find(([, s, inside]) => inside(e, n)
    && tri.every(([, , z]) => z >= s.fromM - HEIGHT_TOLERANCE_M && z <= s.toM + HEIGHT_TOLERANCE_M));
}

/** Coordenadas de textura en metros, como las del modelo: desde arriba en las huellas y de frente en las contrahuellas. */
function uvOf(face: P3[], vertical: boolean): number[] {
  if (!vertical) return face.flatMap(([e, n]) => [e, n]);
  const eastWest = Math.abs(face[1][1] - face[0][1]) >= Math.abs(face[1][0] - face[0][0]);
  return face.flatMap(([e, n, z]) => (eastWest ? [n, z] : [e, z]));
}

/** El piso con sus rampas escalonadas: lo demás queda igual y en su orden; los escalones van en el lugar de su rampa. */
export function withFloorSteps(floor: PlanNode, steps: Map<string, FloorSteps>): PlanNode {
  const list = [...steps].map(([key, s]): [string, FloorSteps, (e: number, n: number) => boolean] => [key, s, inPlanPolygon(s.polygon)]);
  const taken = new Set<string>();
  const pos: number[] = [], tex: number[] = [];
  const emit = (face: P3[], uv: number[]) => { face.forEach(([e, n, z]) => pos.push(e, z, -n)); tex.push(...uv); };
  const { positions: p, uv } = floor;
  for (let t = 0; t < p.length; t += 9) {
    const tri = triangleAt(p, t);
    const match = stepsFor(tri, list);
    if (!match) { emit(tri, uv ? Array.from(uv.slice((t / 3) * 2, (t / 3) * 2 + 6)) : []); continue; }
    const [key, s] = match;
    taken.add(key);
    const levels = Array.from({ length: s.risers + 1 }, (_, k) => s.fromM + ((s.toM - s.fromM) * k) / s.risers);
    const { treads, risers } = stepTriangle(tri, levels);
    treads.forEach((face) => emit(face, uvOf(face, false)));
    risers.forEach(([a, b, c, d]) => { emit([a, b, c], uvOf([a, b, c], true)); emit([a, c, d], uvOf([a, c, d], true)); });
  }
  const unused = list.map(([key]) => key).filter((key) => !taken.has(key));
  if (unused.length) throw new Error(`Los escalones ${unused.join(', ')} no toman nada del piso: el manifiesto no calza con el modelo`);
  return { positions: new Float32Array(pos), uv: uv ? new Float32Array(tex) : null };
}
