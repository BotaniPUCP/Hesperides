import * as THREE from 'three';
import type { Polygon } from '../sceneData';
import type { Target } from '../target';
import type { PointLayer } from './furniture';
import { elementOfVertex } from './geometry';
import { WORLD_LIFT, type PolyLayer } from './polyLayer';

/**
 * Qué hay bajo el cursor: el elemento de una capa (con el punto exacto pulsado)
 * o, si no hay ninguno, un punto del suelo dentro del campus.
 */

export interface Hit {
  target: Target;
  point: THREE.Vector3;
}

const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -WORLD_LIFT);

function insideRing(x: number, y: number, ring: number[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) {
    const xi = ring[i], yi = ring[i + 1], xj = ring[j], yj = ring[j + 1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function setRay(clientX: number, clientY: number, dom: HTMLElement, camera: THREE.Camera) {
  const r = dom.getBoundingClientRect();
  ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
}

export function pick(
  clientX: number,
  clientY: number,
  dom: HTMLElement,
  camera: THREE.Camera,
  objects: THREE.Object3D[],
  isHidden: (target: Target) => boolean,
): Hit | null {
  setRay(clientX, clientY, dom, camera);
  const hits = raycaster.intersectObjects(objects.filter((o) => o.visible), false);
  for (const h of hits) {
    const layer = h.object.userData.layer as PolyLayer | PointLayer | undefined;
    if (!layer) continue;
    let index: number;
    if (layer.kind === 'inst') {
      const map = h.object.userData.map as number[] | undefined;
      index = map && h.instanceId !== undefined ? map[h.instanceId] : (h.instanceId ?? 0);
    } else {
      index = elementOfVertex(layer.starts, (h.faceIndex ?? 0) * 3);
    }
    const target = { layer: layer.id, index };
    if (isHidden(target)) continue;
    return { target, point: h.point.clone() };
  }
  return null;
}

/** Punto del suelo bajo el cursor, solo si cae dentro del campus. */
export function groundPoint(clientX: number, clientY: number, dom: HTMLElement, camera: THREE.Camera, campus: Polygon[]): THREE.Vector3 | null {
  setRay(clientX, clientY, dom, camera);
  const v = new THREE.Vector3();
  if (!raycaster.ray.intersectPlane(groundPlane, v)) return null;
  const inside = campus.some((poly) => insideRing(v.x, -v.z, poly[0]) && !poly.slice(1).some((hole) => insideRing(v.x, -v.z, hole)));
  return inside ? v : null;
}
