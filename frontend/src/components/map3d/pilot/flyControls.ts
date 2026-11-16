import * as THREE from 'three';
import { flyActionFor, flyStep, limitDescent, type FlyAction } from './flyMotion';

/** Metros por segundo frente al radio del modelo: cruzarlo toma unos cuatro segundos. */
const SPEED_PER_RADIUS = 0.5;
const MIN_SPEED_M_S = 4;
/** Un cuadro lento (pestaña en segundo plano) no debe teletransportar la cámara. */
const MAX_FRAME_S = 0.1;
/** La cámara se queda a esta altura sobre el piso del modelo como mínimo. */
const EYE_ABOVE_FLOOR_M = 0.5;

export interface FlyControls {
  /** Apagado de inicio: las teclas solo mueven en el modo de administrador. */
  setEnabled: (on: boolean) => void;
  /** Ajusta la velocidad y el piso al modelo cargado. */
  fitTo: (floorY: number, radius: number) => void;
  dispose: () => void;
}

/**
 * Modo de administrador: W/S adelante y atrás, A/D a los costados, Espacio sube y Shift baja.
 * Mueve la cámara y el centro de la órbita juntos, así que después de volar
 * se sigue girando alrededor de lo que se tiene delante. Escucha solo con el
 * visor enfocado, para no robarle Espacio a la página ni a los botones.
 */
export function attachFlyControls(
  element: HTMLElement,
  camera: THREE.Camera,
  orbitTarget: THREE.Vector3,
  onMove: () => void,
): FlyControls {
  const active = new Set<FlyAction>();
  const look = new THREE.Vector3();
  const delta = new THREE.Vector3();
  let enabled = false;
  let floorY = -Infinity;
  let speed = MIN_SPEED_M_S;
  let frame = 0;
  let last = 0;

  function tick(now: number) {
    const seconds = Math.min((now - last) / 1000, MAX_FRAME_S);
    last = now;
    camera.getWorldDirection(look);
    const step = flyStep(active, { x: look.x, z: look.z }, speed * seconds);
    delta.set(step.x, limitDescent(camera.position.y, step.y, floorY), step.z);
    camera.position.add(delta);
    orbitTarget.add(delta);
    onMove();
    frame = active.size ? requestAnimationFrame(tick) : 0;
  }

  function start() {
    if (frame) return;
    last = performance.now();
    frame = requestAnimationFrame(tick);
  }

  const keydown = (event: KeyboardEvent) => {
    const action = flyActionFor(event.code);
    if (!enabled || !action || event.ctrlKey || event.metaKey || event.altKey) return;
    event.preventDefault();
    active.add(action);
    start();
  };
  const keyup = (event: KeyboardEvent) => {
    const action = flyActionFor(event.code);
    if (action) active.delete(action);
  };
  // Si se suelta la tecla fuera del visor, el keyup nunca llega.
  const release = () => active.clear();
  const focus = () => element.focus({ preventScroll: true });

  element.tabIndex = 0;
  element.addEventListener('keydown', keydown);
  element.addEventListener('keyup', keyup);
  element.addEventListener('blur', release);
  element.addEventListener('pointerdown', focus);

  return {
    setEnabled(on) {
      enabled = on;
      active.clear();
    },
    fitTo(floor, radius) {
      floorY = floor + EYE_ABOVE_FLOOR_M;
      speed = Math.max(MIN_SPEED_M_S, radius * SPEED_PER_RADIUS);
    },
    dispose() {
      cancelAnimationFrame(frame);
      active.clear();
      element.removeEventListener('keydown', keydown);
      element.removeEventListener('keyup', keyup);
      element.removeEventListener('blur', release);
      element.removeEventListener('pointerdown', focus);
    },
  };
}
