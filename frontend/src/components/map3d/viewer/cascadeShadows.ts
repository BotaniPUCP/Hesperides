import * as THREE from 'three';
import { CSM } from 'three/examples/jsm/csm/CSM.js';

/**
 * Sombras en cascada (CSM de three) para el modo Atardecer: tres mapas de sombra,
 * nítidos cerca y amplios lejos, de modo que todo lo que se ve proyecte y reciba
 * sombra. Mientras está prendido reemplaza al sol de la escena (sus luces son el
 * sol). Sin `USE_CSM` en el material, los fragmentos que CSM cambia son los de
 * siempre: el modo de siempre no se toca.
 */

export const CASCADES = { count: 3, mapSize: 2048, maxFarM: 3200, marginM: 250 } as const;

interface Hooked { material: THREE.Material; defines: Record<string, unknown> }

export interface CascadeShadows {
  /** Prende o apaga; `sunDir` va hacia el sol. */
  setEnabled: (on: boolean, sunDir: THREE.Vector3, color: THREE.Color, intensity: number) => void;
  enabled: () => boolean;
  /** Registra los materiales que aparecieron (la ciudad, los árboles del modo); los ya vistos se saltan. */
  adopt: (root: THREE.Object3D) => void;
  /** Por cuadro, antes de dibujar. */
  update: () => void;
  resize: () => void;
  dispose: () => void;
}

/** Los materiales con luces: los únicos donde CSM tiene algo que hacer. */
const LIT = new Set(['MeshStandardMaterial', 'MeshPhysicalMaterial', 'MeshLambertMaterial', 'MeshPhongMaterial']);
const lit = (m: THREE.Material) => LIT.has(m.type);

export function createCascadeShadows(scene: THREE.Scene, camera: THREE.PerspectiveCamera): CascadeShadows {
  const csm = new CSM({
    camera, parent: scene, cascades: CASCADES.count, maxFar: CASCADES.maxFarM, mode: 'practical' as never,
    shadowMapSize: CASCADES.mapSize, lightDirection: new THREE.Vector3(0, -1, 0), lightIntensity: 0,
    lightNear: 1, lightFar: 6000, lightMargin: CASCADES.marginM,
  });
  csm.fade = true;
  csm.lights.forEach((light) => {
    light.shadow.bias = -0.0003;
    light.shadow.normalBias = 0.6;
    light.visible = false;
    light.castShadow = false;
  });
  const hooked: Hooked[] = [];
  const seen = new WeakSet<THREE.Material>();
  /** Las mallas opacas con luces y sus banderas de sombra de siempre: en el modo, todas proyectan y reciben. */
  const casters = new Map<THREE.Mesh, [boolean, boolean]>();
  let on = false;

  /** CSM pisa el onBeforeCompile: se encadena con el que tenía el material (fachadas, follaje, ventanas, césped). */
  function hook(material: THREE.Material) {
    if (seen.has(material) || !lit(material)) return;
    seen.add(material);
    const previous = material.onBeforeCompile;
    const previousKey = material.customProgramCacheKey.bind(material);
    csm.setupMaterial(material);
    const csmHook = material.onBeforeCompile;
    material.onBeforeCompile = (shader, renderer) => {
      previous.call(material, shader, renderer);
      csmHook.call(material, shader, renderer);
    };
    material.customProgramCacheKey = previousKey;
    const defines = { ...(material.defines ?? {}) };
    hooked.push({ material, defines });
    if (!on) strip(material);
  }

  const csmDefines = ['USE_CSM', 'CSM_CASCADES', 'CSM_FADE'];
  function strip(material: THREE.Material) {
    const defines = material.defines as Record<string, unknown> | undefined;
    if (!defines) return;
    csmDefines.forEach((k) => { delete defines[k]; });
    material.needsUpdate = true;
  }
  function restore(h: Hooked) {
    h.material.defines = { ...(h.material.defines ?? {}), ...h.defines };
    h.material.needsUpdate = true;
  }

  return {
    enabled: () => on,
    adopt(root) {
      root.traverse((o) => {
        const mesh = o as THREE.Mesh;
        const m = mesh.material;
        if (!m || !mesh.isMesh) return;
        const list = Array.isArray(m) ? m : [m];
        list.forEach(hook);
        if (!casters.has(mesh) && list.every((x) => lit(x) && !x.transparent)) {
          casters.set(mesh, [mesh.castShadow, mesh.receiveShadow]);
          if (on) { mesh.castShadow = true; mesh.receiveShadow = true; }
        }
      });
    },
    setEnabled(next, sunDir, color, intensity) {
      csm.lightDirection.copy(sunDir).normalize().negate();
      csm.lights.forEach((light) => {
        light.visible = next;
        light.castShadow = next;
        light.color.copy(color);
        light.intensity = intensity;
      });
      if (next !== on) {
        hooked.forEach((h) => (next ? restore(h) : strip(h.material)));
        casters.forEach(([cast, receive], mesh) => {
          mesh.castShadow = next || cast;
          mesh.receiveShadow = next || receive;
        });
      }
      on = next;
    },
    update() {
      if (on) csm.update();
    },
    resize() {
      csm.updateFrustums();
    },
    dispose() {
      csm.remove();
      hooked.forEach((h) => strip(h.material));
    },
  };
}
