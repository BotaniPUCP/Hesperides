import * as THREE from 'three';
import type { Polygon } from '../sceneData';

/** Un punto del suelo en coordenadas de la escena. */
export interface GroundPoint { x: number; z: number }

/** Campo de visión de la cámara y qué fracción de la pantalla puede ocupar lo encuadrado. */
export interface FrameView { fovDeg: number; aspect: number; fill: number }

const UP = new THREE.Vector3(0, 1, 0);

/** Vértices del contorno exterior de las áreas pedidas: los huecos no amplían lo que hay que ver. */
export function sectionPoints(sections: readonly { g: Polygon[]; props: { code: string } }[], codes: ReadonlySet<string>): GroundPoint[] {
  const points: GroundPoint[] = [];
  for (const section of sections) {
    if (!codes.has(section.props.code)) continue;
    for (const polygon of section.g) {
      const ring = polygon[0] ?? [];
      for (let i = 0; i < ring.length; i += 2) points.push({ x: ring[i], z: -ring[i + 1] });
    }
  }
  return points;
}

/** Los ejemplares pedidos, como puntos del suelo para encuadrarlos. */
export function specimenPoints(plants: readonly { p: [number, number] | number[]; props: { code: string } }[],
  codes: ReadonlySet<string>): GroundPoint[] {
  return plants.filter((plant) => codes.has(plant.props.code)).map((plant) => ({ x: plant.p[0], z: -plant.p[1] }));
}

export function framingTarget(points: readonly GroundPoint[], groundY: number): THREE.Vector3 {
  const xs = points.map((p) => p.x), zs = points.map((p) => p.z);
  return new THREE.Vector3((Math.min(...xs) + Math.max(...xs)) / 2, groundY, (Math.min(...zs) + Math.max(...zs)) / 2);
}

/**
 * La distancia más corta, desde `target` en la dirección `dir`, a la que todos
 * los puntos caen dentro del encuadre. Los ejes de pantalla son perpendiculares
 * a `dir`, así que alejarse solo cambia la profundidad y el mínimo sale exacto
 * por punto, sin tantear: d ≥ |lateral| / tan(semiángulo) + avance hacia la cámara.
 */
export function fitDistance(points: readonly GroundPoint[], target: THREE.Vector3, dir: THREE.Vector3, view: FrameView): number {
  const forward = dir.clone().normalize().negate();
  const right = forward.clone().cross(UP);
  if (right.lengthSq() < 1e-12) right.set(1, 0, 0);
  right.normalize();
  const up = right.clone().cross(forward);
  const tanV = Math.tan(THREE.MathUtils.degToRad(view.fovDeg / 2)) * view.fill;
  const tanH = tanV * view.aspect;
  let distance = 0;
  const w = new THREE.Vector3();
  for (const p of points) {
    w.set(p.x - target.x, 0, p.z - target.z);
    const towardCamera = -w.dot(forward);
    distance = Math.max(distance, Math.abs(w.dot(right)) / tanH + towardCamera, Math.abs(w.dot(up)) / tanV + towardCamera);
  }
  return distance;
}
