import * as THREE from 'three';
import type { Polygon } from '../sceneData';
import { drawBackdrop, environmentMap } from './backdrop';
import { polygonShapes } from './geometry';
import type { ScenePalette } from './palette';
import type { SunkenArea } from './planModel';
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
  /** Copias por las dos caras de la cara de arriba y la de los costados del zócalo: el suelo y los muros del modelo (D-08, D-09). */
  modelGround: { top: THREE.MeshPhysicalMaterial; side: THREE.MeshPhysicalMaterial };
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

/**
 * Marca en el stencil los desniveles, antes que todo lo demás (D-09): ni pinta
 * ni toca la profundidad. Queda a la altura del zócalo, así su cara de arriba
 * se abre justo en el borde; las capas del suelo, unos centímetros más arriba,
 * se ven recortadas como si tuvieran canto.
 */
export function createSunkenMask(scene: THREE.Scene, sunken: SunkenArea[]): THREE.Mesh {
  const geo = new THREE.ShapeGeometry(sunken.flatMap((s) => polygonShapes(s.g)));
  geo.rotateX(-Math.PI / 2);
  const mask = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
    colorWrite: false, depthWrite: false, side: THREE.DoubleSide,
    stencilWrite: true, stencilRef: 1, stencilZPass: THREE.ReplaceStencilOp,
  }));
  mask.position.y = WORLD_LIFT;
  mask.renderOrder = -10;
  scene.add(mask);
  return mask;
}

/**
 * Lo que se dibuja con este material se salta lo marcado por la máscara. En
 * three 0.147 la prueba de stencil solo se activa con `stencilWrite`; las
 * operaciones quedan en «conservar», así que no escribe nada.
 */
export function openOverSunken(material: THREE.Material) {
  material.stencilWrite = true;
  material.stencilFunc = THREE.NotEqualStencilFunc;
  material.stencilRef = 1;
}

/** Como las mallas del SKP: por las dos caras, con la sombra de las traseras para que no se sombreen a sí mismas (D-11). */
function doubleSided(material: THREE.MeshPhysicalMaterial): THREE.MeshPhysicalMaterial {
  const copy = material.clone();
  copy.side = THREE.DoubleSide;
  copy.shadowSide = THREE.BackSide;
  return copy;
}

/** Con desniveles, la cara de arriba del zócalo se abre sobre ellos. */
export function createStage(container: HTMLElement, renderer: THREE.WebGLRenderer, campus: Polygon[], textures: SceneTextures, sunken: SunkenArea[] = []): Stage {
  const backdrop = document.createElement('canvas');
  backdrop.className = 'pointer-events-none absolute inset-0 h-full w-full';
  renderer.domElement.className = 'absolute inset-0 h-full w-full touch-none outline-hidden';
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
  const modelGround = { top: doubleSided(plinthTop), side: doubleSided(plinthSide) };
  const plinth = new THREE.Mesh(plinthGeo, [plinthTop, plinthSide]);
  plinth.receiveShadow = true;
  scene.add(plinth);
  if (sunken.length) {
    createSunkenMask(scene, sunken);
    openOverSunken(plinthTop);
  }
  plinthGeo.computeBoundingBox();
  const box = plinthGeo.boundingBox as THREE.Box3;
  const center = new THREE.Vector3((box.min.x + box.max.x) / 2, WORLD_LIFT, (box.min.z + box.max.z) / 2);

  return {
    renderer, scene, backdrop, box, center, plinthTop, plinthSide, modelGround,
    applyTheme(palette, night, width, height) {
      plinthTop.color.set(palette.plinth);
      plinthSide.color.set(palette.plinthSide);
      modelGround.top.color.set(palette.plinth);
      modelGround.side.color.set(palette.plinthSide);
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
