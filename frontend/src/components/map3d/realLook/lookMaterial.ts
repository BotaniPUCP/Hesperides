import * as THREE from 'three';
import { GLASS_NIGHT } from './finishes';
import {
  LOOK_COLOR_FRAGMENT, LOOK_EMISSIVE_FRAGMENT, LOOK_LIGHT_HEAD, LOOK_LIGHTS_FRAGMENT, LOOK_METALNESS_FRAGMENT, LOOK_NORMAL_FRAGMENT,
  LOOK_ROUGHNESS_FRAGMENT,
} from './lookLightShader';
import type { LookTable } from './lookTable';
import { LOOK_FRAGMENT_HEAD, LOOK_VERTEX_BODY, LOOK_VERTEX_HEAD } from './lookShader';

/** Lo que el material usa donde no hay ficha; donde la hay, cada acabado trae los suyos (SPEC-112 D-18). */
const MATTE_ROUGHNESS = 0.88;
const NO_GLOW = new THREE.Color(0, 0, 0);
const NIGHT_GLOW = new THREE.Color(GLASS_NIGHT.color).multiplyScalar(GLASS_NIGHT.glow);

/** La tabla de fachadas como textura: un texel por parámetro, sin filtrar. */
export function lookTexture(table: LookTable): THREE.DataTexture {
  const texture = new THREE.DataTexture(table.data, table.width, table.height, THREE.RGBAFormat, THREE.FloatType);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.needsUpdate = true;
  return texture;
}

/** Cada `#include` que la fachada reemplaza, con su reemplazo. */
const FRAGMENT_HOOKS: [string, string][] = [
  ['#include <common>', `#include <common>\n${LOOK_FRAGMENT_HEAD}\n${LOOK_LIGHT_HEAD}`],
  ['#include <color_fragment>', LOOK_COLOR_FRAGMENT],
  ['#include <roughnessmap_fragment>', LOOK_ROUGHNESS_FRAGMENT],
  ['#include <metalnessmap_fragment>', LOOK_METALNESS_FRAGMENT],
  ['#include <normal_fragment_maps>', LOOK_NORMAL_FRAGMENT],
  ['#include <emissivemap_fragment>', LOOK_EMISSIVE_FRAGMENT],
  ['#include <lights_fragment_end>', LOOK_LIGHTS_FRAGMENT],
];

/** El material del modo real: el de un edificio, con las regiones de material y el acabado de cada cara. No descarga imágenes. */
export function createLookMaterial(table: LookTable): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: MATTE_ROUGHNESS, metalness: 0, envMapIntensity: 0.35,
    side: THREE.DoubleSide, shadowSide: THREE.BackSide,
  });
  const uniforms = {
    lookTable: { value: lookTexture(table) }, lookRows: { value: table.height }, lookNightGlow: { value: NO_GLOW.clone() },
  };
  material.userData.lookUniforms = uniforms;
  // fwidth y dFdx en WebGL1; en WebGL2 ya vienen. Los tipos de three 0.147 solo lo declaran en ShaderMaterial.
  Object.assign(material, { extensions: { derivatives: true } });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${LOOK_VERTEX_HEAD}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${LOOK_VERTEX_BODY}`);
    shader.fragmentShader = FRAGMENT_HOOKS.reduce((src, [hook, code]) => {
      if (!src.includes(hook)) throw new Error(`El shader de three no tiene ${hook}: la fachada no se puede enganchar`);
      return src.replace(hook, code);
    }, shader.fragmentShader);
  };
  material.customProgramCacheKey = () => 'hesperides-real-look-2';
  return material;
}

/** De noche se encienden los paños elegidos del vidrio (SPEC-112 D-19); de día, nada. */
export function setLookNight(material: THREE.Material, night: boolean): void {
  (material.userData.lookUniforms.lookNightGlow.value as THREE.Color).copy(night ? NIGHT_GLOW : NO_GLOW);
}
