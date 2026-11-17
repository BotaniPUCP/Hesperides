import * as THREE from 'three';
import type { Polygon } from '../sceneData';

/**
 * Parapetos de los techos planos del campus en el modo Atardecer: un muro bajo por
 * el borde de cada techo, que le da canto y sombra propia. La cota sale de la malla
 * de cada edificio; un techo inclinado (pocos vértices arriba) no lleva.
 */

export const PARAPET = { heightM: 0.9, thicknessM: 0.22, color: '#bdb5a8', flatVertices: 6, flatToleranceM: 0.35, minEdgeM: 1.2 } as const;

/** La cota del techo de un edificio (en coordenadas de su malla) si es plano; si no, null. */
export function flatRoofTop(positions: ArrayLike<number>, from: number, to: number): number | null {
  let top = -Infinity;
  for (let v = from; v < to; v++) top = Math.max(top, positions[v * 3 + 1]);
  let near = 0;
  for (let v = from; v < to; v++) if (top - positions[v * 3 + 1] < PARAPET.flatToleranceM) near++;
  return near >= PARAPET.flatVertices && Number.isFinite(top) ? top : null;
}

interface Edge { x: number; z: number; length: number; yaw: number; y: number }

/** Un tramo de parapeto por lado del anillo exterior, metido medio espesor hacia adentro. */
export function parapetEdges(footprints: Polygon[][], tops: (number | null)[]): Edge[] {
  const edges: Edge[] = [];
  footprints.forEach((g, i) => {
    const top = tops[i];
    const ring = g[0]?.[0];
    if (top === null || !ring || ring.length < 6) return;
    let area = 0;
    for (let k = 0, j = ring.length - 2; k < ring.length; j = k, k += 2) area += ring[j] * ring[k + 1] - ring[k] * ring[j + 1];
    const inward = area > 0 ? 1 : -1; // antihorario: el interior queda a la izquierda
    for (let k = 0; k < ring.length; k += 2) {
      const ax = ring[k], ay = ring[k + 1], bx = ring[(k + 2) % ring.length], by = ring[(k + 3) % ring.length];
      const length = Math.hypot(bx - ax, by - ay);
      if (length < PARAPET.minEdgeM) continue;
      const nx = (-(by - ay) / length) * inward * (PARAPET.thicknessM / 2), ny = ((bx - ax) / length) * inward * (PARAPET.thicknessM / 2);
      // En la escena: x igual, z = -y; el ángulo se mide como el de la dirección (x, -y).
      edges.push({ x: (ax + bx) / 2 + nx, z: -((ay + by) / 2 + ny), length, yaw: Math.atan2(by - ay, bx - ax), y: top });
    }
  });
  return edges;
}

export function createParapets(scene: THREE.Scene, footprints: Polygon[][], positions: ArrayLike<number>, starts: number[], lift: number): THREE.InstancedMesh {
  const tops = footprints.map((_, i) => flatRoofTop(positions, starts[i], starts[i + 1]));
  const edges = parapetEdges(footprints, tops);
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0),
    new THREE.MeshStandardMaterial({ color: PARAPET.color, roughness: 0.8 }), edges.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  edges.forEach((e, k) => {
    m.compose(p.set(e.x, e.y + lift, e.z), q.setFromAxisAngle(up, e.yaw), s.set(e.length + PARAPET.thicknessM, PARAPET.heightM, PARAPET.thicknessM));
    mesh.setMatrixAt(k, m);
  });
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.raycast = () => undefined;
  mesh.visible = false;
  scene.add(mesh);
  return mesh;
}
