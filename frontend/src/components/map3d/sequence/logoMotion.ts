import { cameraPoseAt } from './sequencePath';
import { SWAP_AT_S } from './sequenceTimeline';

/**
 * El logo de la secuencia (SPEC-118 §9), sin three. Desde el primer cuadro aparece
 * en el centro, de transparente a opaco y creciendo apenas (D-11); desde el segundo 1
 * se desliza despacio hacia arriba a la izquierda, junto con el giro de la cámara
 * (D-13), y queda anclado en el espacio,
 * fuera del eje de la cámara para que lo pase por un costado sin llenar la pantalla.
 * La coreografía va comprimida (D-10): de 5 a 6 s muestra lo que mostraría de 8 a
 * 9 s, así se va justo con el desenfoque. Posición en fracciones del cuadro (0-1,
 * origen arriba a la izquierda) y ancho en fracción del ancho del cuadro.
 */

type Vec3 = [number, number, number];

/** La coreografía, en su propio tiempo: quieto en el centro hasta 4 s, se desliza y se ancla a 6 s. */
export const LOGO_LANDED_S = 4;
export const LOGO_SETTLE_S = 6;
/** Hacia dónde se desliza antes de anclarse; la mirada de la cámara gira lo mismo (sequenceCamera). */
export const LOGO_ANCHOR_SCREEN = { x: 0.35, y: 0.35 };
/** La hoja ocupa ~965 de los 1080 px de la imagen; en el centro ocupa el 40 % del cuadro. */
const LEAF_SHARE = 965 / 1080;
const LEAF_WIDTH = 0.4;
export const LOGO_IMAGE_WIDTH = LEAF_WIDTH / LEAF_SHARE;
/** A esta distancia la cámara lo pasa sin que tape más de ~30 %. */
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
const clamp01 = (k: number) => Math.min(1, Math.max(0, k));
const easeInOut = (k: number) => { const c = clamp01(k); return c * c * (3 - 2 * c); };

/** La base de la cámara en ese instante, como `lookAt` con el arriba del mundo. */
function cameraFrame(t: number) {
  const { position, target } = cameraPoseAt(t);
  const forward = unit(sub(target, position));
  const right = unit(cross(forward, [0, 1, 0]));
  return { position, forward, right, up: cross(right, forward) };
}

/** El punto del espacio que a los 6 s de la coreografía cae en ANCHOR_SCREEN: depende del aspecto. */
const anchors = new Map<number, Vec3>();
function anchorFor(aspect: number): Vec3 {
  const known = anchors.get(aspect);
  if (known) return known;
  const { position, forward, right, up } = cameraFrame(LOGO_SETTLE_S);
  const nx = (LOGO_ANCHOR_SCREEN.x - 0.5) * 2 * HALF_FOV_TAN * aspect, ny = (0.5 - LOGO_ANCHOR_SCREEN.y) * 2 * HALF_FOV_TAN;
  const anchor = [0, 1, 2].map((i) => position[i] + (forward[i] + right[i] * nx + up[i] * ny) * LOGO_ANCHOR_M) as Vec3;
  anchors.set(aspect, anchor);
  return anchor;
}

const imageAt = (t: number): LogoState['image'] => (t < SWAP_AT_S ? 'pixel' : 'original');
const centered = (t: number, width: number, opacity: number): LogoState =>
  ({ visible: true, image: imageAt(t), x: 0.5, y: 0.5, width, rotationDeg: 0, opacity });

function drifting(t: number): LogoState {
  const e = easeInOut((t - LOGO_LANDED_S) / (LOGO_SETTLE_S - LOGO_LANDED_S));
  return { ...centered(t, LOGO_IMAGE_WIDTH, 1), x: 0.5 + (LOGO_ANCHOR_SCREEN.x - 0.5) * e, y: 0.5 + (LOGO_ANCHOR_SCREEN.y - 0.5) * e };
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

/** La coreografía a su velocidad original, desde que está en el centro. `aspect`: ancho entre alto del cuadro. */
export function logoSourceAt(t: number, aspect: number): LogoState {
  if (t < LOGO_LANDED_S) return centered(t, LOGO_IMAGE_WIDTH, 1);
  return t < LOGO_SETTLE_S ? drifting(t) : anchored(t, aspect);
}

/** Hasta aquí se ve el logo en la secuencia. */
export const LOGO_END_S = 6;
/** De 2 a 5 s la coreografía va rápida: cubre la de 2 a 8 s. De 5 a 6 s va a velocidad original (8 a 9 s). */
const WARP_FROM_S = 2;
const REAL_SPEED_FROM_S = 5;
const SOURCE_AT_REAL_SPEED_S = 8;
/** Antes de llegar a velocidad original, baja suave durante este tramo. */
const SLOWDOWN_S = 1;
const FAST_SPEED = (() => {
  const real = REAL_SPEED_FROM_S - WARP_FROM_S, source = SOURCE_AT_REAL_SPEED_S - WARP_FROM_S;
  return (source - SLOWDOWN_S / 2) / (real - SLOWDOWN_S / 2);
})();
/** Cuando, en la secuencia, termina de deslizarse y queda anclado: donde la coreografía comprimida llega a 6 s. */
export const LOGO_ANCHORED_S = WARP_FROM_S + (LOGO_SETTLE_S - WARP_FROM_S) / FAST_SPEED;
/** De transparente a opaco en el primer segundo; desde ahí se desliza despacio hasta anclarse. */
const FADE_IN_S = 1;
export const LOGO_DRIFT_FROM_S = FADE_IN_S;
/** Mientras aparece y se desliza crece de 92 % a 100 %. */
const APPEAR_SCALE = 0.92;
/** Se desvanece al final, ya pasado el desenfoque: a los 9 s de la coreografía todavía tapa una esquina. */
const FADE_OUT_S = 0.3;

/** El tiempo de la coreografía que toca en el segundo `t` de la secuencia (t ≥ WARP_FROM_S). */
function sourceTime(t: number): number {
  const slowdownAt = REAL_SPEED_FROM_S - SLOWDOWN_S;
  if (t <= slowdownAt) return WARP_FROM_S + FAST_SPEED * (t - WARP_FROM_S);
  if (t >= REAL_SPEED_FROM_S) return SOURCE_AT_REAL_SPEED_S + (t - REAL_SPEED_FROM_S);
  const u = t - slowdownAt;
  // La velocidad baja en línea recta de FAST_SPEED a 1.
  return WARP_FROM_S + FAST_SPEED * (slowdownAt - WARP_FROM_S) + FAST_SPEED * u - ((FAST_SPEED - 1) * u * u) / (2 * SLOWDOWN_S);
}

function appearing(t: number): LogoState {
  const grow = easeInOut(t / LOGO_ANCHORED_S);
  const drift = easeInOut((t - LOGO_DRIFT_FROM_S) / (LOGO_ANCHORED_S - LOGO_DRIFT_FROM_S));
  return {
    ...centered(t, LOGO_IMAGE_WIDTH * (APPEAR_SCALE + (1 - APPEAR_SCALE) * grow), easeInOut(t / FADE_IN_S)),
    x: 0.5 + (LOGO_ANCHOR_SCREEN.x - 0.5) * drift,
    y: 0.5 + (LOGO_ANCHOR_SCREEN.y - 0.5) * drift,
  };
}

/** El logo en el segundo `t` de la secuencia. `aspect`: ancho entre alto del cuadro. */
export function logoAt(t: number, aspect: number): LogoState {
  if (t < 0 || t >= LOGO_END_S) return { ...centered(t, 0, 0), visible: false };
  if (t < LOGO_ANCHORED_S) return appearing(t);
  const state = logoSourceAt(sourceTime(t), aspect);
  const fade = 1 - easeInOut((t - (LOGO_END_S - FADE_OUT_S)) / FADE_OUT_S);
  return { ...state, image: imageAt(t), opacity: state.opacity * fade };
}
