import * as THREE from 'three';
import { flyActionFor } from '../pilot/flyMotion';
import { WORLD_LIFT } from './polyLayer';

/**
 * En el modo de administrador, el centro de la órbita (el anclaje del zoom y del
 * desplazamiento) se pone sobre lo que se ve en el centro de la pantalla: el edificio, el
 * árbol o el suelo. Se recalcula al soltar las teclas de vuelo, al terminar de mirar o de
 * desplazar, y justo antes de cada zoom; así el zoom acerca a lo que se mira y no a un
 * punto que quedó fijo atrás.
 */

/** Más lejos que esto no se ancla: mirando al horizonte el anclaje queda donde estaba. */
export const ADMIN_ANCHOR_MAX_M = 3000;

const CENTER = new THREE.Vector2(0, 0);
const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), -WORLD_LIFT);

export interface AnchorHit {
  distance: number;
  point: THREE.Vector3;
}

/** Lo primero visible al frente; sin eso, el suelo; sin nada cerca, ninguno. */
export function chooseAnchor(hits: readonly AnchorHit[], groundHit: THREE.Vector3 | null): THREE.Vector3 | null {
  const first = hits.find((h) => h.distance <= ADMIN_ANCHOR_MAX_M);
  return first ? first.point : groundHit;
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
    const near = onGround && onGround.distanceTo(camera.position) <= ADMIN_ANCHOR_MAX_M ? onGround : null;
    const anchor = chooseAnchor(hits, near);
    if (anchor) {
      target.copy(anchor);
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
