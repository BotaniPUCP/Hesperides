import type { CameraPose } from '../viewer/cameraRig';
import { LOGO_ANCHOR_SCREEN, LOGO_ANCHORED_S, LOGO_DRIFT_FROM_S } from './logoMotion';
import { cameraPoseAt, SEQUENCE_DURATION_S } from './sequencePath';

/**
 * La toma que se ve (SPEC-118 D-12): la ruta de sequencePath con un giro sutil de
 * la mirada. Mientras el logo se desliza hacia LOGO_ANCHOR_SCREEN, la cámara gira lo
 * mismo hacia el lado contrario, así se mueve todo el encuadre y no solo la imagen.
 * Después vuelve despacio a la ruta y la toma final no cambia. La cámara no se
 * desplaza: solo cambia hacia dónde mira.
 */

type Vec3 = [number, number, number];

export const GAZE_START_S = LOGO_DRIFT_FROM_S;
export const GAZE_PEAK_S = LOGO_ANCHORED_S;
/** El mismo campo de visión que la cámara del visor (cameraRig). */
const HALF_FOV_TAN = Math.tan((38 * Math.PI) / 360);

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const smooth = (k: number) => { const c = Math.min(1, Math.max(0, k)); return c * c * (3 - 2 * c); };

/** Cuánto del giro se aplica: sube con la misma curva que el deslizamiento del logo y luego baja hasta el final. */
function gazeAmount(t: number): number {
  if (t <= GAZE_START_S || t >= SEQUENCE_DURATION_S) return 0;
  if (t < GAZE_PEAK_S) return smooth((t - GAZE_START_S) / (GAZE_PEAK_S - GAZE_START_S));
  return 1 - smooth((t - GAZE_PEAK_S) / (SEQUENCE_DURATION_S - GAZE_PEAK_S));
}

const unit = (a: Vec3): Vec3 => { const l = Math.sqrt(dot(a, a)); return [a[0] / l, a[1] / l, a[2] / l]; };
/** Los ejes de una cámara que mira hacia `forward`, como `lookAt` con el arriba del mundo. */
function axes(forward: Vec3) {
  const right = unit(cross(forward, [0, 1, 0]));
  return { forward, right, up: cross(right, forward) };
}

/** Dónde cae la dirección `d` en el cuadro de una cámara que mira hacia `forward`. */
function screenOf(forward: Vec3, d: Vec3, aspect: number) {
  const { right, up } = axes(forward), z = dot(d, forward);
  return { x: 0.5 + dot(d, right) / z / (HALF_FOV_TAN * aspect) / 2, y: 0.5 - dot(d, up) / z / HALF_FOV_TAN / 2 };
}

/** Las iteraciones que ajustan el giro: al girar se inclinan un poco los ejes y el cálculo directo se desvía ~1 %. */
const REFINE_STEPS = 4;

/** La dirección hacia la que mirar para que `ahead` (el centro de la ruta) caiga donde termina el logo. */
function turnedForward(ahead: Vec3, aspect: number): Vec3 {
  const { right, up } = axes(ahead);
  let nx = (0.5 - LOGO_ANCHOR_SCREEN.x) * 2 * HALF_FOV_TAN * aspect, ny = (LOGO_ANCHOR_SCREEN.y - 0.5) * 2 * HALF_FOV_TAN;
  const turned = () => unit([0, 1, 2].map((i) => ahead[i] + right[i] * nx + up[i] * ny) as Vec3);
  for (let i = 0; i < REFINE_STEPS; i++) {
    const seen = screenOf(turned(), ahead, aspect);
    nx += (seen.x - LOGO_ANCHOR_SCREEN.x) * 2 * HALF_FOV_TAN * aspect;
    ny -= (seen.y - LOGO_ANCHOR_SCREEN.y) * 2 * HALF_FOV_TAN;
  }
  return turned();
}

/** `aspect`: ancho entre alto del cuadro; el giro horizontal depende de él. */
export function shotPoseAt(t: number, aspect: number): CameraPose {
  const base = cameraPoseAt(t), k = gazeAmount(t);
  if (k === 0) return base;
  const look = sub(base.target, base.position), distance = Math.sqrt(dot(look, look));
  const ahead = unit(look), full = turnedForward(ahead, aspect);
  // Mira hacia el lado contrario a donde termina el logo (derecha y abajo), en la proporción `k`.
  const gaze = unit([0, 1, 2].map((i) => ahead[i] + (full[i] - ahead[i]) * k) as Vec3);
  const target = [0, 1, 2].map((i) => base.position[i] + gaze[i] * distance) as Vec3;
  return { position: base.position, target };
}
