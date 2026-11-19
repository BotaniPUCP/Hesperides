import * as THREE from 'three';
import type { DeadlineStatus } from '@shared/types';
import { WORLD_LIFT } from './polyLayer';

/**
 * Un marcador por incidencia activa (SPEC-201 §3.10): una esfera sobre un poste, del color de su
 * plazo, para ver de un vistazo qué se está por vencer y dónde.
 */

export interface PlacedIncident { id: number; x: number; z: number; deadlineStatus: DeadlineStatus | null }

const COLORS: Record<DeadlineStatus, number> = { ON_TIME: 0x16a34a, DUE_SOON: 0xf59e0b, OVERDUE: 0xdc2626 };
const NO_DEADLINE = 0x6b7280;
/** Alto suficiente para verse sobre los árboles bajos sin tapar los edificios cercanos. */
const POLE_M = 6;
const BALL_M = 1.8;

export function markerColor(status: DeadlineStatus | null): number {
  return status ? COLORS[status] : NO_DEADLINE;
}

export interface IncidentMarkers {
  set: (incidents: PlacedIncident[]) => void;
  position: (id: number) => THREE.Vector3 | null;
  hitTest: (clientX: number, clientY: number, dom: HTMLElement, camera: THREE.Camera) => number | null;
  dispose: () => void;
}

const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();

export function createIncidentMarkers(scene: THREE.Object3D): IncidentMarkers {
  const group = new THREE.Group();
  scene.add(group);
  const ball = new THREE.SphereGeometry(BALL_M, 16, 12);
  const pole = new THREE.CylinderGeometry(0.15, 0.15, POLE_M, 6);
  const markers = new Map<number, THREE.Group>();
  const materials: THREE.Material[] = [];

  function clear() {
    materials.forEach((m) => m.dispose());
    materials.length = 0;
    markers.clear();
    group.clear();
  }

  return {
    set(incidents) {
      clear();
      incidents.forEach((incident) => {
        // Sin prueba de profundidad: es un aviso, como los nombres; un edificio no debe taparlo.
        const material = new THREE.MeshBasicMaterial({ color: markerColor(incident.deadlineStatus), depthTest: false });
        materials.push(material);
        const marker = new THREE.Group();
        const head = new THREE.Mesh(ball, material);
        head.position.y = POLE_M;
        head.userData.incidentId = incident.id;
        const stick = new THREE.Mesh(pole, material);
        stick.position.y = POLE_M / 2;
        marker.add(stick, head);
        marker.position.set(incident.x, WORLD_LIFT, incident.z);
        marker.renderOrder = 25;
        markers.set(incident.id, marker);
        group.add(marker);
      });
    },
    position: (id) => markers.get(id)?.position.clone() ?? null,
    hitTest(clientX, clientY, dom, camera) {
      if (markers.size === 0) return null;
      const r = dom.getBoundingClientRect();
      ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObjects([...markers.values()], true).find((h) => h.object.userData.incidentId !== undefined);
      return hit ? (hit.object.userData.incidentId as number) : null;
    },
    dispose() {
      clear();
      ball.dispose();
      pole.dispose();
      scene.remove(group);
    },
  };
}
