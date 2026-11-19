import * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { attachFlyControls } from './flyControls';
import { directionOf, turnView, viewOf } from './lookAround';

/** Medio grado por píxel: cruzar el visor de lado a lado da casi media vuelta. */
const LOOK_RADIANS_PER_PIXEL = Math.PI / 360;
const RIGHT_BUTTON = 2;

export interface AdminMovement {
  setEnabled: (on: boolean) => void;
  fitTo: (floorY: number, radius: number) => void;
  dispose: () => void;
}

/**
 * El modo de movimiento de administrador: vuela con el teclado y, con el clic
 * derecho, mira alrededor desde donde está la cámara en vez de orbitar. Apagado,
 * la órbita queda exactamente como estaba.
 */
export function attachAdminMovement(
  element: HTMLElement,
  camera: THREE.Camera,
  controls: OrbitControls,
  onChange: () => void,
): AdminMovement {
  const fly = attachFlyControls(element, camera, controls.target, onChange);
  const orbitPolarLimit = controls.maxPolarAngle;
  const offset = new THREE.Vector3();
  let enabled = false;
  let looking = false;

  // El centro de la órbita queda delante del ojo, a la misma distancia: así el
  // desplazamiento y la rueda siguen funcionando igual mientras se mira.
  function lookBy(dx: number, dy: number) {
    offset.subVectors(controls.target, camera.position);
    const distance = offset.length();
    const view = turnView(viewOf(offset), dx, dy, LOOK_RADIANS_PER_PIXEL);
    const { x, y, z } = directionOf(view);
    controls.target.copy(camera.position).add(offset.set(x, y, z).multiplyScalar(distance));
    onChange();
  }

  const pointerdown = (event: PointerEvent) => { looking = enabled && event.button === RIGHT_BUTTON; };
  const pointermove = (event: PointerEvent) => { if (looking) lookBy(event.movementX, event.movementY); };
  const stopLooking = () => { looking = false; };

  element.addEventListener('pointerdown', pointerdown);
  element.addEventListener('pointermove', pointermove);
  element.addEventListener('pointerup', stopLooking);
  element.addEventListener('pointercancel', stopLooking);

  return {
    setEnabled(on) {
      enabled = on;
      looking = false;
      fly.setEnabled(on);
      // OrbitControls haría girar alrededor del centro con el clic derecho.
      controls.enableRotate = !on;
      // Desde dentro hay que poder mirar hacia arriba, que la órbita no permite.
      controls.maxPolarAngle = on ? Math.PI : orbitPolarLimit;
      if (on) element.focus({ preventScroll: true });
    },
    fitTo: fly.fitTo,
    dispose() {
      fly.dispose();
      element.removeEventListener('pointerdown', pointerdown);
      element.removeEventListener('pointermove', pointermove);
      element.removeEventListener('pointerup', stopLooking);
      element.removeEventListener('pointercancel', stopLooking);
    },
  };
}
