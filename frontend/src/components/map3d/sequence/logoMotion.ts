import { cameraPoseAt } from './sequencePath';
import { SWAP_AT_S } from './sequenceTimeline';

/**
 * El logo de la secuencia (SPEC-118 §9), sin three: de 2 a 4 s cae girando al
 * centro, de 4 a 6 s se desliza hacia arriba a la izquierda y a los 6 s queda
 * anclado en el espacio; la cámara lo pasa por un costado. Fuera del eje de la
 * cámara, porque centrado la cámara iría directo hacia él y llenaría la pantalla.
 * Posición en fracciones del cuadro (0-1, origen arriba a la izquierda) y ancho
 * en fracción del ancho del cuadro.
 */

type Vec3 = [number, number, number];

export const LOGO_APPEAR_S = 2;
export const LOGO_LANDED_S = 4;
export const LOGO_SETTLE_S = 6;
const FADE_IN_S = 0.3;
const TURNS = 1;
const START_SCALE = 0.15;
const START_Y = 0.15;
/** Hacia dónde se desliza antes de anclarse. */
const ANCHOR_SCREEN = { x: 0.35, y: 0.35 };
/** La hoja ocupa ~965 de los 1080 px de la imagen; al llegar ocupa el 40 % del cuadro. */
const LEAF_SHARE = 965 / 1080;
const LEAF_WIDTH = 0.4;
export const LOGO_IMAGE_WIDTH = LEAF_WIDTH / LEAF_SHARE;
/** A esta distancia la cámara lo pasa sin que tape más de ~30 % y sale hacia los 10,3 s. */
export const LOGO_ANCHOR_M = 300;
/** El mismo campo de visión que la cámara del visor (cameraRig). */
const HALF_FOV_TAN = Math.tan((38 * Math.PI) / 360);
/** Más cerca que esto, la cámara ya lo está atravesando: no se dibuja. */
const NEAR_M = 2;

export interface LogoState {
  visible: boolean;
  image: 'pixel' | 'original';
  x: number;
  y: number;
  width: number;
  rotationDeg: number;
  opacity: number;
}

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a: Vec3): Vec3 => { const l = Math.sqrt(dot(a, a)); return [a[0] / l, a[1] / l, a[2] / l]; };
const easeOut = (k: number) => 1 - (1 - k) ** 3;
/** El giro frena con una curva más suave que la caída: arranca más lento y se nota menos. */
const easeOutSoft = (k: number) => 1 - (1 - k) ** 2;
const easeInOut = (k: number) => k * k * (3 - 2 * k);

/** La base de la cámara en ese instante, como `lookAt` con el arriba del mundo. */
function cameraFrame(t: number) {
  const { position, target } = cameraPoseAt(t);
  const forward = unit(sub(target, position));
  const right = unit(cross(forward, [0, 1, 0]));
  return { position, forward, right, up: cross(right, forward) };
}

/** El punto del espacio que a los 6 s cae en ANCHOR_SCREEN: depende del aspecto del cuadro. */
const anchors = new Map<number, Vec3>();
function anchorFor(aspect: number): Vec3 {
  const known = anchors.get(aspect);
  if (known) return known;
  const { position, forward, right, up } = cameraFrame(LOGO_SETTLE_S);
  const nx = (ANCHOR_SCREEN.x - 0.5) * 2 * HALF_FOV_TAN * aspect, ny = (0.5 - ANCHOR_SCREEN.y) * 2 * HALF_FOV_TAN;
  const anchor = [0, 1, 2].map((i) => position[i] + (forward[i] + right[i] * nx + up[i] * ny) * LOGO_ANCHOR_M) as Vec3;
  anchors.set(aspect, anchor);
  return anchor;
}

const imageAt = (t: number): LogoState['image'] => (t < SWAP_AT_S ? 'pixel' : 'original');

function falling(t: number): LogoState {
  const k = (t - LOGO_APPEAR_S) / (LOGO_LANDED_S - LOGO_APPEAR_S), e = easeOut(k);
  return {
    visible: true, image: imageAt(t), x: 0.5,
    y: START_Y + (0.5 - START_Y) * e,
    width: LOGO_IMAGE_WIDTH * (START_SCALE + (1 - START_SCALE) * e),
    rotationDeg: TURNS * 360 * (1 - easeOutSoft(k)),
    opacity: Math.min(1, (t - LOGO_APPEAR_S) / FADE_IN_S),
  };
}

function drifting(t: number): LogoState {
  const e = easeInOut((t - LOGO_LANDED_S) / (LOGO_SETTLE_S - LOGO_LANDED_S));
  return {
    visible: true, image: imageAt(t),
    x: 0.5 + (ANCHOR_SCREEN.x - 0.5) * e, y: 0.5 + (ANCHOR_SCREEN.y - 0.5) * e,
    width: LOGO_IMAGE_WIDTH, rotationDeg: 0, opacity: 1,
  };
}

function anchored(t: number, aspect: number): LogoState {
  const { position, forward, right, up } = cameraFrame(t);
  const v = sub(anchorFor(aspect), position), depth = dot(v, forward);
  const safe = Math.max(depth, NEAR_M);
  return {
    visible: depth > NEAR_M, image: imageAt(t),
    x: 0.5 + dot(v, right) / safe / (HALF_FOV_TAN * aspect) / 2,
    y: 0.5 - dot(v, up) / safe / HALF_FOV_TAN / 2,
    width: (LOGO_IMAGE_WIDTH * LOGO_ANCHOR_M) / safe,
    rotationDeg: 0, opacity: 1,
  };
}

/** `aspect`: ancho entre alto del cuadro; la posición horizontal depende de él. */
export function logoAt(t: number, aspect: number): LogoState {
  if (t < LOGO_APPEAR_S) return { visible: false, image: 'pixel', x: 0.5, y: START_Y, width: 0, rotationDeg: 0, opacity: 0 };
  if (t < LOGO_LANDED_S) return falling(t);
  return t < LOGO_SETTLE_S ? drifting(t) : anchored(t, aspect);
}
