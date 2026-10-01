import * as THREE from 'three';
import type { ScenePalette } from './palette';

/**
 * Luces de la maqueta, las del prototipo v39: un sol que se mueve con la hora
 * (a la latitud del campus), luz de cielo y tres rellenos que cambian de tono
 * entre el día y la noche.
 */

/** Latitud del campus para la trayectoria del sol. */
const CAMPUS_LATITUDE_DEG = -12.07;
/** Distancia del sol al centro: lejos para que las sombras sean casi paralelas. */
const SUN_DISTANCE_M = 1800;
const SHADOW_EXTENT_M = 720;

export interface Lights {
  sun: THREE.DirectionalLight;
  setHour: (hour: number, night: boolean) => void;
  applyTheme: (palette: ScenePalette, night: boolean) => void;
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
  Object.assign(sun.shadow.camera, {
    left: -SHADOW_EXTENT_M, right: SHADOW_EXTENT_M, top: SHADOW_EXTENT_M, bottom: -SHADOW_EXTENT_M, near: 10, far: 4000,
  });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.6;
  sun.target.position.copy(center);
  scene.add(hemi, sun, sun.target, fill, rim, ambient);

  function setHour(hour: number, night: boolean) {
    const h = ((hour - 12) * 15 * Math.PI) / 180, phi = (CAMPUS_LATITUDE_DEG * Math.PI) / 180;
    const east = -Math.sin(h), north = -Math.sin(phi) * Math.cos(h), up = Math.cos(phi) * Math.cos(h);
    const dir = new THREE.Vector3(east, Math.max(up, 0.05), -north).normalize();
    sun.position.copy(center).addScaledVector(dir, SUN_DISTANCE_M);
    if (night) {
      sun.color.set(0xc4d5ff);
    } else {
      const low = Math.max(0, 1 - up * 2.2); // sol bajo: más cálido
      sun.color.setRGB(1, 1 - low * 0.18, 1 - low * 0.38);
    }
  }

  function applyTheme(palette: ScenePalette, night: boolean) {
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
  }

  return { sun, setHour, applyTheme };
}
