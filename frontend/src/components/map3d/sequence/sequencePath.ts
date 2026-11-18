import type { CameraPose } from '../viewer/cameraRig';

/**
 * La trayectoria de la secuencia (SPEC-118 §6.1-§6.2), sin three: una curva limpia
 * entre la primera y la última pose de la grabación de referencia del 17 nov 2026.
 */

type Vec3 = [number, number, number];

export const SEQUENCE_DURATION_S = 12;

/**
 * Toda la ruta va corrida 126 m al oeste y 141 m al norte (D-15): así, a los 6 s, el
 * edificio de (-30, 265) queda abajo a la derecha y la cámara lo pasa por su lado.
 */
const ROUTE_SHIFT: Vec3 = [-126, 0, -141];
const shifted = (v: Vec3): Vec3 => [v[0] + ROUTE_SHIFT[0], v[1] + ROUTE_SHIFT[1], v[2] + ROUTE_SHIFT[2]];

/** Las poses de la grabación de referencia, corridas. */
export const SEQUENCE_START: CameraPose = { position: shifted([-76.463, 304.492, 1330.868]), target: shifted([-16.72, 22, 229.821]) };
export const SEQUENCE_END: CameraPose = { position: shifted([0.666, 37.962, 256.692]), target: shifted([-16.952, 27.439, 170.911]) };

/** Qué tan lejos avanza, sin bajar casi, el primer punto de control: primero avanza y luego desciende. */
const FORWARD_FIRST = 0.4;
/** El segundo punto de control: casi encima del final, con una parte de la altura todavía por bajar. */
const FORWARD_SECOND = 0.85;
const HEIGHT_LEFT_SECOND = 0.25;
const HEIGHT_KEPT_FIRST = 0.95;

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const clamp01 = (k: number) => Math.min(1, Math.max(0, k));

/** Un punto de control: avanza `forward` en planta y queda a la altura `y`. */
function controlPoint(from: Vec3, to: Vec3, forward: number, y: number): Vec3 {
  return [lerp(from[0], to[0], forward), y, lerp(from[2], to[2], forward)];
}

const [P0, P3] = [SEQUENCE_START.position, SEQUENCE_END.position];
const P1 = controlPoint(P0, P3, FORWARD_FIRST, lerp(P3[1], P0[1], HEIGHT_KEPT_FIRST));
const P2 = controlPoint(P0, P3, FORWARD_SECOND, lerp(P3[1], P0[1], HEIGHT_LEFT_SECOND));

function bezier(u: number): Vec3 {
  const a = (1 - u) ** 3, b = 3 * (1 - u) ** 2 * u, c = 3 * (1 - u) * u ** 2, d = u ** 3;
  return [0, 1, 2].map((i) => a * P0[i] + b * P1[i] + c * P2[i] + d * P3[i]) as Vec3;
}

/**
 * Del tiempo normalizado al avance: Hermite con velocidad 1 al inicio (la toma ya
 * viene en movimiento) y 0 al final (se detiene sin golpe).
 */
export function sequenceProgress(k: number): number {
  const x = clamp01(k);
  return -(x ** 3) + x ** 2 + x;
}

export function cameraPoseAt(seconds: number): CameraPose {
  const e = sequenceProgress(seconds / SEQUENCE_DURATION_S);
  if (e === 0) return SEQUENCE_START;
  const [T0, T1] = [SEQUENCE_START.target, SEQUENCE_END.target];
  return { position: bezier(e), target: [0, 1, 2].map((i) => lerp(T0[i], T1[i], e)) as Vec3 };
}
