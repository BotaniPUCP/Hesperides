import * as THREE from 'three';

/**
 * Variación de tono del césped en el modo Atardecer: manchas de 9 y 37 m en la
 * posición de la escena, unas más verdes y otras más secas, para que el pasto no
 * sea un paño de un solo color. En el modo de siempre la intensidad es 0 y el
 * césped queda igual.
 */

const VERTEX_HEAD = /* glsl */ `
varying vec2 vGrassXZ;
`;

const VERTEX_BODY = /* glsl */ `
vec4 grassWorld = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
grassWorld = instanceMatrix * grassWorld;
#endif
vGrassXZ = (modelMatrix * grassWorld).xz;
`;

const FRAGMENT_HEAD = /* glsl */ `
uniform float grassVariation;
varying vec2 vGrassXZ;
float grassHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float grassNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(grassHash(i), grassHash(i + vec2(1.0, 0.0)), u.x), mix(grassHash(i + vec2(0.0, 1.0)), grassHash(i + vec2(1.0, 1.0)), u.x), u.y);
}
`;

const FRAGMENT_COLOR = /* glsl */ `
#include <color_fragment>
if (grassVariation > 0.0) {
  float n = grassNoise(vGrassXZ / 9.0) * 0.6 + grassNoise(vGrassXZ / 37.0 + 11.0) * 0.4;
  // De más verde y oscuro a más seco y claro.
  vec3 tint = mix(vec3(0.82, 0.95, 0.8), vec3(1.14, 1.06, 0.82), smoothstep(0.25, 0.8, n));
  diffuseColor.rgb *= mix(vec3(1.0), tint, grassVariation);
}
`;

const INSTALLED = 'grassVariation';

/** Prende o apaga la variación en el material del césped (la primera vez, le agrega el shader). */
export function setGrassVariation(material: THREE.Material, on: boolean): void {
  if (!material.userData[INSTALLED]) {
    const uniforms = { grassVariation: { value: 0 } };
    material.userData[INSTALLED] = uniforms;
    const previous = material.onBeforeCompile;
    material.onBeforeCompile = (shader, renderer) => {
      previous.call(material, shader, renderer);
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\n${VERTEX_HEAD}`)
        .replace('#include <project_vertex>', `#include <project_vertex>\n${VERTEX_BODY}`);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\n${FRAGMENT_HEAD}`)
        .replace('#include <color_fragment>', FRAGMENT_COLOR);
    };
    const key = material.customProgramCacheKey.bind(material);
    material.customProgramCacheKey = () => `${key()}-grass`;
    material.needsUpdate = true;
  }
  (material.userData[INSTALLED] as { grassVariation: { value: number } }).grassVariation.value = on ? 1 : 0;
}
