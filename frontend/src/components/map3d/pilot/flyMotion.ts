import { isCtrlShift, type KeyCombo } from '../keyCombo';

/**
 * Movimiento libre por teclado en los pilotos 3D. Lógica pura: recibe las
 * teclas activas y la mirada, y devuelve cuánto se desplaza la cámara. La
 * altura es el eje Y de three.js.
 */

export type FlyAction = 'forward' | 'back' | 'left' | 'right' | 'up' | 'down';

export interface Vec3 { x: number; y: number; z: number }
/** La mirada de la cámara proyectada sobre el piso; no hace falta normalizarla. */
export interface Heading { x: number; z: number }

/** Por `KeyboardEvent.code`, para que valga igual en cualquier distribución de teclado. */
const KEY_ACTIONS: Readonly<Record<string, FlyAction>> = {
  KeyW: 'forward', KeyS: 'back', KeyA: 'left', KeyD: 'right',
  Space: 'up', ShiftLeft: 'down', ShiftRight: 'down',
};

export function flyActionFor(code: string): FlyAction | undefined {
  return Object.hasOwn(KEY_ACTIONS, code) ? KEY_ACTIONS[code] : undefined;
}

/** Un `-0` no mueve nada, pero se lee como un error al depurar y al comparar. */
const withoutNegativeZero = (n: number) => n || 0;

const axis = (active: ReadonlySet<FlyAction>, plus: FlyAction, minus: FlyAction) =>
  Number(active.has(plus)) - Number(active.has(minus));

/** El desplazamiento de un paso de `distance` metros con las teclas `active`. */
export function flyStep(active: ReadonlySet<FlyAction>, heading: Heading, distance: number): Vec3 {
  const ahead = axis(active, 'forward', 'back');
  const aside = axis(active, 'right', 'left');
  const length = Math.hypot(heading.x, heading.z);
  // La derecha de una mirada (x, z) sobre el piso es (-z, x).
  const x = length ? (heading.x * ahead - heading.z * aside) / length : 0;
  const z = length ? (heading.z * ahead + heading.x * aside) / length : 0;
  // Normalizar el plano evita que la diagonal recorra √2 veces más.
  const planar = Math.hypot(x, z);
  const scale = planar ? distance / planar : 0;
  return { x: withoutNegativeZero(x * scale), y: withoutNegativeZero(axis(active, 'up', 'down') * distance), z: withoutNegativeZero(z * scale) };
}

/** Recorta un descenso `dy` para que la altura `y` no quede bajo `floorY`. */
export function limitDescent(y: number, dy: number, floorY: number): number {
  if (dy >= 0) return dy;
  return Math.max(dy, Math.min(0, floorY - y));
}

/**
 * Metros por segundo por cada metro de holgura: a la altura de una persona, unos 2,5 m/s. La
 * holgura es lo que hay hasta el piso o hasta lo que se mira, lo que esté más cerca.
 */
export const SPEED_PER_CLEARANCE = 1.5;
/** Pegado a una pared o al piso, la cámara igual se mueve, despacio. */
export const MIN_FLY_SPEED_M_S = 1;

/**
 * La velocidad de vuelo según la holgura, hasta `maxSpeed`: con una fija, la que cruza el campus
 * en segundos daba saltos de metros al recorrer un pasillo de cerca.
 */
export function flySpeed(clearance: number, maxSpeed: number): number {
  return Math.min(maxSpeed, Math.max(MIN_FLY_SPEED_M_S, clearance * SPEED_PER_CLEARANCE));
}

/** Ctrl+Shift+U entra y sale del modo de movimiento de administrador. */
export const isAdminModeToggle = (event: KeyCombo) => isCtrlShift(event, 'KeyU');
