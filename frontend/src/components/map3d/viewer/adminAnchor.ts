import * as THREE from 'three';
import { flyActionFor } from '../pilot/flyMotion';
import { WORLD_LIFT } from './polyLayer';

/**
 * En el modo de administrador, el centro de la órbita (el anclaje del zoom y del
 * desplazamiento) se pone sobre lo que se ve en el centro de la pantalla: el edificio, el
 * árbol o el suelo. Se recalcula al soltar las teclas de vuelo, al terminar de mirar o de
 * desplazar, y justo antes de cada zoom; así el zoom acerca a lo que se mira y no a un
 * punto que quedó fijo atrás.
 *
 * El anclaje queda siempre sobre el rayo del centro, a la distancia de lo que se cruza: re-anclar
 * nunca gira la vista. Antes se tomaba el punto que devolvía three.js, y en una línea (un borde)
 * ese punto puede estar hasta un metro al costado del rayo: con la cámara pegada a un borde, la
 * vista saltaba a mirar arriba o abajo (grabación del 16 nov 2026, giros de 100 a 180° en un cuadro).
 */

/** Más lejos que esto no se ancla: mirando al horizonte el anclaje queda donde estaba. */
export const ADMIN_ANCHOR_MAX_M = 3000;

const CENTER = new THREE.Vector2(0, 0);
const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), -WORLD_LIFT);

/**
 * A qué distancia sobre el rayo del centro se ancla: lo primero que se ve al frente; sin eso, el
 * suelo; sin nada, ninguno. Lo que está a menos de `nearest` (el plano cercano de la cámara) no se
 * dibuja, así que no cuenta: se ancla en lo que se ve detrás.
 */
export function chooseAnchorDistance(hits: readonly { distance: number }[], groundDistance: number | null, nearest: number): number | null {
  const counts = (d: number) => d >= nearest && d <= ADMIN_ANCHOR_MAX_M;
  const first = hits.find((h) => counts(h.distance));
  if (first) return first.distance;
  return groundDistance !== null && counts(groundDistance) ? groundDistance : null;
}

const shown = (o: THREE.Object3D | null): boolean => !o || (o.visible && shown(o.parent));

export interface AdminAnchor {
  setEnabled: (on: boolean) => void;
  dispose: () => void;
}

export function attachAdminAnchor(
  element: HTMLElement,
  camera: THREE.Camera,
  target: THREE.Vector3,
  scene: THREE.Scene,
  onChange: () => void,
): AdminAnchor {
  const raycaster = new THREE.Raycaster();
  const groundHit = new THREE.Vector3();
  let enabled = false;

  function reanchor() {
    if (!enabled) return;
    raycaster.setFromCamera(CENTER, camera);
    const hits = raycaster.intersectObjects(scene.children, true).filter((h) => shown(h.object));
    const onGround = raycaster.ray.intersectPlane(ground, groundHit);
    const nearest = camera instanceof THREE.PerspectiveCamera ? camera.near : 0;
    const distance = chooseAnchorDistance(hits, onGround ? onGround.distanceTo(raycaster.ray.origin) : null, nearest);
    if (distance !== null) {
      raycaster.ray.at(distance, target);
      onChange();
    }
  }

  const keyup = (event: KeyboardEvent) => { if (flyActionFor(event.code)) reanchor(); };
  element.addEventListener('keyup', keyup);
  element.addEventListener('pointerup', reanchor);
  // En captura: corre antes que los controles, que hacen el zoom hacia el anclaje.
  element.addEventListener('wheel', reanchor, { capture: true });

  return {
    setEnabled(on) {
      enabled = on;
      reanchor();
    },
    dispose() {
      element.removeEventListener('keyup', keyup);
      element.removeEventListener('pointerup', reanchor);
      element.removeEventListener('wheel', reanchor, { capture: true });
    },
  };
}
