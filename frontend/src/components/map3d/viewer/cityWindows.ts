import * as THREE from 'three';

/**
 * Ventanas de los edificios del entorno en el modo Atardecer, sin geometría: en
 * las caras verticales una grilla de pisos y vanos; el vano apagado es vidrio
 * oscuro y alrededor de una cuarta parte se enciende en cálido, con su propia
 * intensidad. Los techos van más grises. Lejos, la grilla se funde en su promedio
 * para que no haga moiré.
 */

export const CITY_WINDOWS = {
  /** Ancho del vano a vano y alto de piso, en metros. */
  bayM: 3.2,
  floorM: 3,
  litShare: 0.26,
  // Desaturado un 20 % hacia su luminancia: si no, las ventanas suman al naranja de todo lo demás.
  glow: (() => { const c = new THREE.Color('#ffb267'); const l = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b; return c.lerp(new THREE.Color(l, l, l), 0.2).multiplyScalar(0.9); })(),
  /** Cuánto oscurece el vidrio apagado y cuánto el techo. */
  glass: 0.45,
  roof: 0.72,
} as const;

const VERTEX_HEAD = /* glsl */ `
varying vec3 vCityPos;
varying vec3 vCityNormal;
`;

const VERTEX_BODY = /* glsl */ `
vec4 cityWorld = vec4(transformed, 1.0);
vec3 cityNormal = objectNormal;
#ifdef USE_INSTANCING
cityWorld = instanceMatrix * cityWorld;
cityNormal = mat3(instanceMatrix) * cityNormal;
#endif
vCityPos = (modelMatrix * cityWorld).xyz;
vCityNormal = normalize(mat3(modelMatrix) * cityNormal);
`;

const FRAGMENT_HEAD = /* glsl */ `
uniform float cityGround;
uniform vec3 cityGlow;
varying vec3 vCityPos;
varying vec3 vCityNormal;
float cityHash(vec2 p) { return fract(sin(dot(p, vec2(41.37, 289.13))) * 15731.743); }
`;

const FRAGMENT_COLOR = /* glsl */ `
#include <color_fragment>
float cityWin = 0.0;
float cityLit = 0.0;
vec3 cityN = normalize(vCityNormal);
if (abs(cityN.y) > 0.6) {
  diffuseColor.rgb *= ${CITY_WINDOWS.roof.toFixed(2)};
} else {
  float along = abs(cityN.x) > abs(cityN.z) ? vCityPos.z : vCityPos.x;
  vec2 cell = vec2(along / ${CITY_WINDOWS.bayM.toFixed(1)}, (vCityPos.y - cityGround) / ${CITY_WINDOWS.floorM.toFixed(1)});
  vec2 f = fract(cell), id = floor(cell);
  float bay = step(0.22, f.x) * step(f.x, 0.78) * step(0.32, f.y) * step(f.y, 0.82);
  float pick = cityHash(id + floor(vCityPos.xz * 0.05) * 7.0);
  float lit = step(1.0 - ${CITY_WINDOWS.litShare.toFixed(2)}, pick) * (0.15 + 1.1 * cityHash(id.yx + 3.1) * cityHash(id.yx + 3.1));
  // Lejos (un píxel cubre media celda o más), el promedio: sin moiré.
  float far = smoothstep(0.25, 0.6, max(fwidth(cell.x), fwidth(cell.y)));
  cityWin = mix(bay, 0.3, far);
  cityLit = mix(bay * lit, 0.3 * ${CITY_WINDOWS.litShare.toFixed(2)} * 1.0, far);
  diffuseColor.rgb *= mix(1.0, ${CITY_WINDOWS.glass.toFixed(2)}, cityWin);
}
`;

const FRAGMENT_EMISSIVE = /* glsl */ `
#include <emissivemap_fragment>
totalEmissiveRadiance += cityGlow * cityLit;
`;

/** Le pone las ventanas a un material de edificios del entorno. `groundY`: la cota de la calle. */
export function withCityWindows<M extends THREE.MeshStandardMaterial>(material: M, groundY: number): M {
  const uniforms = { cityGround: { value: groundY }, cityGlow: { value: CITY_WINDOWS.glow.clone() } };
  Object.assign(material, { extensions: { derivatives: true } });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${VERTEX_HEAD}`)
      .replace('#include <project_vertex>', `#include <project_vertex>\n${VERTEX_BODY}`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${FRAGMENT_HEAD}`)
      .replace('#include <color_fragment>', FRAGMENT_COLOR)
      .replace('#include <emissivemap_fragment>', FRAGMENT_EMISSIVE);
  };
  material.customProgramCacheKey = () => 'hesperides-city-windows';
  return material;
}
