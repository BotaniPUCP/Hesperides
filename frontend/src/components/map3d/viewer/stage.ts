import * as THREE from 'three';
import type { Polygon } from '../sceneData';
import { drawBackdrop, environmentMap } from './backdrop';
import { polygonShapes } from './geometry';
import type { ScenePalette } from './palette';
import { WORLD_LIFT } from './polyLayer';
import type { SceneTextures } from './textures';

/**
 * Renderizador, escena y zócalo del campus. Si el navegador no tiene WebGL,
 * crear el renderizador lanza: quien llama muestra entonces las listas
 * (SPEC-102 §5.2).
 */

const PLINTH_DEPTH_M = 1.6;

export interface Stage {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  backdrop: HTMLCanvasElement;
  box: THREE.Box3;
  center: THREE.Vector3;
  plinthTop: THREE.MeshPhysicalMaterial;
  plinthSide: THREE.MeshPhysicalMaterial;
  applyTheme: (palette: ScenePalette, night: boolean, width: number, height: number) => void;
  resize: (width: number, height: number) => void;
  dispose: () => void;
}

export function createRenderer(): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.4;
  return renderer;
}

export function createStage(container: HTMLElement, renderer: THREE.WebGLRenderer, campus: Polygon[], textures: SceneTextures): Stage {
  const backdrop = document.createElement('canvas');
  backdrop.className = 'pointer-events-none absolute inset-0 h-full w-full';
  renderer.domElement.className = 'absolute inset-0 h-full w-full touch-none outline-none';
  renderer.domElement.tabIndex = 0;
  container.append(backdrop, renderer.domElement);

  const scene = new THREE.Scene();
  const envDay = environmentMap(renderer, false), envNight = environmentMap(renderer, true);
  const plinthTop = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, roughness: 0.3, metalness: 0.02, clearcoat: 0.5, clearcoatRoughness: 0.2,
    map: textures.ground, normalMap: textures.groundNormal, normalScale: new THREE.Vector2(0.6, 0.6), envMapIntensity: 0.2,
  });
  const plinthSide = new THREE.MeshPhysicalMaterial({
    color: 0xcccccc, roughness: 0.35, metalness: 0.02, clearcoat: 0.4, clearcoatRoughness: 0.25,
    map: textures.ground, normalMap: textures.groundNormal, normalScale: new THREE.Vector2(0.5, 0.5), envMapIntensity: 0.15,
  });
  const plinthGeo = new THREE.ExtrudeGeometry(polygonShapes(campus)[0], { depth: PLINTH_DEPTH_M, bevelEnabled: false });
  plinthGeo.rotateX(-Math.PI / 2);
  plinthGeo.translate(0, -PLINTH_DEPTH_M + WORLD_LIFT, 0);
  const plinth = new THREE.Mesh(plinthGeo, [plinthTop, plinthSide]);
  plinth.receiveShadow = true;
  scene.add(plinth);
  plinthGeo.computeBoundingBox();
  const box = plinthGeo.boundingBox as THREE.Box3;
  const center = new THREE.Vector3((box.min.x + box.max.x) / 2, WORLD_LIFT, (box.min.z + box.max.z) / 2);

  return {
    renderer, scene, backdrop, box, center, plinthTop, plinthSide,
    applyTheme(palette, night, width, height) {
      plinthTop.color.set(palette.plinth);
      plinthSide.color.set(palette.plinthSide);
      scene.environment = night ? envNight : envDay;
      renderer.toneMappingExposure = night ? 1.18 : 1.38;
      drawBackdrop(backdrop, width, height, night);
    },
    resize(width, height) {
      renderer.setSize(width, height, false);
    },
    dispose() {
      renderer.dispose();
      envDay.dispose();
      envNight.dispose();
      backdrop.remove();
      renderer.domElement.remove();
    },
  };
}
