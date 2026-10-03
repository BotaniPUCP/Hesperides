import * as THREE from 'three';
import { MapControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Meta } from './geometry';

/**
 * Cámara y controles del prototipo v39: arrastrar desplaza, clic derecho o dos
 * dedos giran, la rueda acerca. Los movimientos programados (encuadrar, ir a un
 * elemento) son vuelos suaves que se cortan si el usuario toca el mapa.
 */

const FLIGHT_MS = 1100;
/** Cuánto puede alejarse el centro de la vista del borde del campus, en metros. */
const PAN_MARGIN_M = 300;
const FOCUS_MIN_DISTANCE_M = 230;

type Vec3 = [number, number, number];

/** Dónde está la cámara y hacia dónde mira: basta para devolverla a la misma vista. */
export interface CameraPose { position: Vec3; target: Vec3 }

interface Flight { p0: THREE.Vector3; t0: THREE.Vector3; p1: THREE.Vector3; t1: THREE.Vector3; start: number; ms: number }

export interface CameraRig {
  camera: THREE.PerspectiveCamera;
  controls: MapControls;
  fit: () => void;
  top: () => void;
  north: () => void;
  focus: (meta: Meta, heightHint?: number) => void;
  focusPoint: (x: number, z: number) => void;
  toggleSpin: () => boolean;
  /** Avanza el vuelo en curso; true si la cámara se movió. */
  step: (now: number) => boolean;
  cancelFlight: () => void;
  pose: () => CameraPose;
}

export function createCameraRig(dom: HTMLElement, box: THREE.Box3, center: THREE.Vector3, reducedMotion: boolean, initialPose?: CameraPose): CameraRig {
  const camera = new THREE.PerspectiveCamera(38, 1, 2, 9000);
  const controls = new MapControls(camera, dom);
  Object.assign(controls, { enableDamping: true, dampingFactor: 0.09, maxPolarAngle: 1.32, minDistance: 35, maxDistance: 2600, zoomSpeed: 1.1, rotateSpeed: 0.7 });
  controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };
  let flight: Flight | null = null;

  controls.addEventListener('change', () => {
    const t = controls.target;
    const cx = THREE.MathUtils.clamp(t.x, box.min.x - PAN_MARGIN_M, box.max.x + PAN_MARGIN_M);
    const cz = THREE.MathUtils.clamp(t.z, box.min.z - PAN_MARGIN_M, box.max.z + PAN_MARGIN_M);
    if (cx !== t.x || cz !== t.z) {
      camera.position.x += cx - t.x;
      camera.position.z += cz - t.z;
      t.x = cx;
      t.z = cz;
    }
  });

  function flyTo(position: THREE.Vector3, target: THREE.Vector3, ms = FLIGHT_MS) {
    if (reducedMotion) {
      camera.position.copy(position);
      controls.target.copy(target);
      return;
    }
    flight = { p0: camera.position.clone(), t0: controls.target.clone(), p1: position, t1: target, start: performance.now(), ms };
  }

  function fitPose(): [THREE.Vector3, THREE.Vector3] {
    const radius = Math.hypot(box.max.x - box.min.x, box.max.z - box.min.z) / 2;
    const vf = THREE.MathUtils.degToRad(camera.fov / 2), hf = Math.atan(Math.tan(vf) * camera.aspect);
    const dist = (radius / Math.sin(Math.min(vf, hf))) * (camera.aspect < 1 ? 0.92 : 0.8);
    const dir = new THREE.Vector3(0.2, 0.78, 0.6).normalize();
    return [center.clone().addScaledVector(dir, dist), center.clone()];
  }

  function horizontalOffset(): THREE.Vector3 {
    const off = camera.position.clone().sub(controls.target);
    off.y = 0;
    if (off.lengthSq() < 1) off.set(0, 0, 1);
    return off.normalize();
  }

  function focusAt(target: THREE.Vector3, dist: number) {
    flyTo(target.clone().addScaledVector(horizontalOffset(), dist * 0.62).add(new THREE.Vector3(0, dist * 0.72, 0)), target);
  }

  const [p, t] = initialPose ? [new THREE.Vector3(...initialPose.position), new THREE.Vector3(...initialPose.target)] : fitPose();
  camera.position.copy(p);
  controls.target.copy(t);
  controls.update();

  return {
    camera,
    controls,
    fit: () => flyTo(...fitPose()),
    top: () => {
      const target = controls.target.clone(), d = Math.max(camera.position.distanceTo(target), 700);
      flyTo(new THREE.Vector3(target.x, d, target.z + 0.01), target);
    },
    north: () => {
      const target = controls.target.clone(), off = camera.position.clone().sub(target);
      flyTo(new THREE.Vector3(target.x, camera.position.y, target.z + Math.hypot(off.x, off.z)), target, 700);
    },
    focus: (meta, heightHint = 0) => focusAt(new THREE.Vector3(meta.x, center.y + heightHint, meta.z), Math.max(FOCUS_MIN_DISTANCE_M, meta.r * 4.6)),
    focusPoint: (x, z) => focusAt(new THREE.Vector3(x, center.y, z), FOCUS_MIN_DISTANCE_M),
    toggleSpin: () => {
      controls.autoRotate = !controls.autoRotate;
      controls.autoRotateSpeed = -0.6;
      return controls.autoRotate;
    },
    step: (now) => {
      if (!flight) return false;
      const k = Math.min(1, (now - flight.start) / flight.ms);
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      camera.position.lerpVectors(flight.p0, flight.p1, e);
      controls.target.lerpVectors(flight.t0, flight.t1, e);
      if (k >= 1) flight = null;
      return true;
    },
    cancelFlight: () => {
      flight = null;
    },
    pose: () => ({ position: camera.position.toArray() as Vec3, target: controls.target.toArray() as Vec3 }),
  };
}
