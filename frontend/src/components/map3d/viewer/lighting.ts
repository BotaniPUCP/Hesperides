import * as THREE from 'three';
import type { ScenePalette } from './palette';
import { SHADOW_FIT, shadowRadius, snapToTexels } from './shadowFit';

/**
 * Luces de la maqueta, las del prototipo v39: un sol que se mueve con la hora
 * (a la latitud del campus), luz de cielo y tres rellenos que cambian de tono
 * entre el día y la noche.
 */

/** Latitud del campus para la trayectoria del sol. */
const CAMPUS_LATITUDE_DEG = -12.07;
/** Distancia del sol al centro: lejos para que las sombras sean casi paralelas. */
const SUN_DISTANCE_M = 1800;
/** El separador de la sombra en texeles: 0,6 m con el mapa de ±720 m de antes, y proporcional al achicarlo (D-21). */
const NORMAL_BIAS_TEXELS = 1.7;
/**
 * Hora dorada: un sol naranja fuerte y rasante, un cielo azulado que apenas llena las sombras, y sin los
 * rellenos del modo de siempre, que aplanan el volumen. Las sombras quedan frías y las caras al sol, ámbar.
 */
const DUSK = {
  sun: 0xff9f55, sunIntensity: 2.7,
  hemiSky: 0x8396cc, hemiGround: 0x4a3530, hemiIntensity: 0.32,
  rim: 0xff9a5a, rimIntensity: 0.12,
  ambient: 0xb7a8c8, ambientIntensity: 0.1,
} as const;

export interface Lights {
  sun: THREE.DirectionalLight;
  /** Hacia dónde está el sol, unitario. */
  sunDir: () => THREE.Vector3;
  setHour: (hour: number, night: boolean) => void;
  /** Con `dusk`, la luz de la hora dorada (modo Atardecer): manda sobre la de la paleta. */
  applyTheme: (palette: ScenePalette, night: boolean, dusk?: boolean, twilight?: number) => void;
  /** Centra el mapa de sombras en lo que mira la cámara (SPEC-112 D-21). */
  follow: (target: THREE.Vector3, cameraDistance: number) => void;
}

export function createLights(scene: THREE.Scene, center: THREE.Vector3, coarsePointer: boolean): Lights {
  const hemi = new THREE.HemisphereLight(0xffe0a0, 0xc8b898, 0.85);
  const sun = new THREE.DirectionalLight(0xffd890, 0.95);
  const fill = new THREE.DirectionalLight(0xffe8c0, 0.3);
  const rim = new THREE.DirectionalLight(0xffd0a0, 0.2);
  const ambient = new THREE.AmbientLight(0xffe4c0, 0.18);
  fill.position.set(-600, 350, 500);
  rim.position.set(100, 250, -700);

  sun.castShadow = true;
  const mapSize = coarsePointer ? 2048 : 4096; // en móvil, la mitad: la memoria de video manda
  sun.shadow.mapSize.set(mapSize, mapSize);
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 4000;
  sun.shadow.bias = -0.0004;
  scene.add(hemi, sun, sun.target, fill, rim, ambient);

  const dir = new THREE.Vector3(0, 1, 0);
  const focus = center.clone();
  let radius = 0;
  let dusk = false;

  function setRadius(r: number) {
    radius = r;
    Object.assign(sun.shadow.camera, { left: -r, right: r, top: r, bottom: -r });
    sun.shadow.camera.updateProjectionMatrix();
    sun.shadow.normalBias = NORMAL_BIAS_TEXELS * ((2 * r) / mapSize);
  }

  /** El sol a su distancia del centro de la sombra, que cae en la retícula de texeles. */
  function place() {
    const [x, y, z] = snapToTexels([focus.x, focus.y, focus.z], [dir.x, dir.y, dir.z], radius, mapSize);
    sun.target.position.set(x, y, z);
    sun.target.updateMatrixWorld();
    sun.position.copy(sun.target.position).addScaledVector(dir, SUN_DISTANCE_M);
  }

  function follow(target: THREE.Vector3, cameraDistance: number) {
    const r = shadowRadius(cameraDistance);
    if (r !== radius) setRadius(r);
    focus.copy(target);
    place();
  }
  setRadius(SHADOW_FIT.maxM);

  function setHour(hour: number, night: boolean) {
    const h = ((hour - 12) * 15 * Math.PI) / 180, phi = (CAMPUS_LATITUDE_DEG * Math.PI) / 180;
    const east = -Math.sin(h), north = -Math.sin(phi) * Math.cos(h), up = Math.cos(phi) * Math.cos(h);
    dir.set(east, Math.max(up, 0.05), -north).normalize();
    place();
    if (night) {
      sun.color.set(0xc4d5ff);
    } else if (dusk) {
      sun.color.set(DUSK.sun);
    } else {
      const low = Math.max(0, 1 - up * 2.2); // sol bajo: más cálido
      sun.color.setRGB(1, 1 - low * 0.18, 1 - low * 0.38);
    }
  }

  /** `twilight`: cuánto es ya crepúsculo; el sol directo y el cielo bajan. */
  function applyTheme(palette: ScenePalette, night: boolean, golden = false, twilight = 0) {
    dusk = golden && !night;
    hemi.color.set(palette.hemiSky);
    hemi.groundColor.set(palette.hemiGround);
    hemi.intensity = palette.hemiIntensity;
    sun.intensity = palette.sunIntensity;
    fill.color.set(night ? 0x88a8ff : 0xffe8c0);
    fill.intensity = night ? 0.2 : 0.32;
    rim.color.set(night ? 0xb49cff : 0xffd69a);
    rim.intensity = night ? 0.3 : 0.24;
    ambient.color.set(night ? 0x7068b5 : 0xffe4c0);
    ambient.intensity = night ? 0.24 : 0.2;
    if (!dusk) return;
    hemi.color.set(DUSK.hemiSky);
    hemi.groundColor.set(DUSK.hemiGround);
    hemi.intensity = DUSK.hemiIntensity * (1 - 0.35 * twilight);
    sun.intensity = DUSK.sunIntensity * (1 - 0.85 * twilight);
    fill.intensity = 0;
    rim.color.set(DUSK.rim);
    rim.intensity = DUSK.rimIntensity;
    ambient.color.set(DUSK.ambient);
    ambient.intensity = DUSK.ambientIntensity;
  }

  return { sun, sunDir: () => dir.clone(), setHour, applyTheme, follow };
}
