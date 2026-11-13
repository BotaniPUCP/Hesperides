import * as THREE from 'three';
import type { LookTable } from './lookTable';
import { ROW_TEXELS } from './lookTable';
import { LOOK_COLOR_FRAGMENT, LOOK_FRAGMENT_HEAD, LOOK_ROUGHNESS_FRAGMENT, LOOK_VERTEX_BODY, LOOK_VERTEX_HEAD } from './lookShader';

/** Rugosidad de muros, losas y techos: mates, como se ven en las fotos (D-13). */
const MATTE_ROUGHNESS = 0.88;

/** La tabla de fachadas como textura: un texel por parámetro, sin filtrar. */
export function lookTexture(table: LookTable): THREE.DataTexture {
  const texture = new THREE.DataTexture(table.data, ROW_TEXELS, table.rows, THREE.RGBAFormat, THREE.FloatType);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.needsUpdate = true;
  return texture;
}

/** El atlas de tramos de foto; hasta que llega, un gris neutro. `onLoad` pide redibujar. */
function atlasTexture(url: string, onLoad: () => void): THREE.Texture {
  const texture = new THREE.TextureLoader().load(url, onLoad);
  texture.anisotropy = 8;
  return texture;
}

/** El material del modo real: el de un edificio, mate, con el patrón o la foto de cada cara. */
export function createLookMaterial(table: LookTable, atlasUrl: string, onAtlas: () => void): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: MATTE_ROUGHNESS, metalness: 0, envMapIntensity: 0.35,
    side: THREE.DoubleSide, shadowSide: THREE.BackSide,
  });
  const uniforms = { lookTable: { value: lookTexture(table) }, lookAtlas: { value: atlasTexture(atlasUrl, onAtlas) }, lookRows: { value: table.rows } };
  // fwidth en WebGL1; en WebGL2 ya viene. Los tipos de three 0.147 solo lo declaran en ShaderMaterial.
  Object.assign(material, { extensions: { derivatives: true } });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${LOOK_VERTEX_HEAD}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${LOOK_VERTEX_BODY}`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${LOOK_FRAGMENT_HEAD}`)
      .replace('#include <color_fragment>', LOOK_COLOR_FRAGMENT)
      .replace('#include <roughnessmap_fragment>', LOOK_ROUGHNESS_FRAGMENT);
  };
  material.customProgramCacheKey = () => 'hesperides-real-look';
  return material;
}
