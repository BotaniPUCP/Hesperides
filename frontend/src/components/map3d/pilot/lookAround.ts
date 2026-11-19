import type { Vec3 } from './flyMotion';

/**
 * Mirar alrededor sin moverse: la mirada como giro horizontal (`yaw`, positivo
 * a la izquierda) e inclinación (`pitch`, positiva hacia arriba), en radianes.
 * Sin giro se mira hacia -Z, como la cámara de three.js.
 */
export interface View { yaw: number; pitch: number }

/** Casi vertical: en la vertical exacta el giro horizontal pierde sentido. */
export const MAX_PITCH = (85 * Math.PI) / 180;

export function viewOf(direction: Vec3): View {
  const length = Math.hypot(direction.x, direction.y, direction.z);
  return { yaw: Math.atan2(-direction.x, -direction.z), pitch: Math.asin(direction.y / length) };
}

export function directionOf({ yaw, pitch }: View): Vec3 {
  const flat = Math.cos(pitch);
  return { x: -Math.sin(yaw) * flat, y: Math.sin(pitch), z: -Math.cos(yaw) * flat };
}

/** Arrastrar `dx`, `dy` píxeles gira la mirada en el mismo sentido, como mover la cabeza. */
export function turnView(view: View, dx: number, dy: number, radiansPerPixel: number): View {
  const pitch = view.pitch - dy * radiansPerPixel;
  return { yaw: view.yaw - dx * radiansPerPixel, pitch: Math.min(MAX_PITCH, Math.max(-MAX_PITCH, pitch)) };
}
