/**
 * Cómo entra la fachada en el `MeshStandardMaterial` (SPEC-112 D-16 a D-20):
 * reemplazos de los `#include` de three 0.147. El color de la ficha pasa a
 * albedo y lleva su grano, el volumen y el contacto; la rugosidad y el metal
 * salen del acabado; el relieve perturba la normal como el `bumpMap`; el vidrio
 * refleja más y de noche se enciende.
 */

/** Cuánto más refleja el cielo un paño de vidrio que un muro (D-19). */
export const GLASS_ENV_BOOST = 2;

export const LOOK_LIGHT_HEAD = /* glsl */ `
uniform vec3 lookNightGlow;
/** El interior que se ve tras todo el vidrio al atardecer (cero de día y en el modo de siempre). */
uniform vec3 lookInterior;
/** Cuánto se lleva la luz de las ventanas hacia su luminancia (el Atardecer, 0,2). */
uniform float lookEmissiveDesat;
/** Cuánto más refleja el cielo el vidrio que un muro; el Atardecer lo sube. */
uniform float lookGlassEnv;

// perturbNormalArb de three (bumpmap_pars_fragment), que solo se declara con un bumpMap: aquí la altura es el relieve.
vec3 lookBump(vec3 surfPos, vec3 surfNorm, vec2 dHdxy, float faceDir) {
  vec3 sigmaX = dFdx(surfPos.xyz);
  vec3 sigmaY = dFdy(surfPos.xyz);
  vec3 r1 = cross(sigmaY, surfNorm);
  vec3 r2 = cross(surfNorm, sigmaX);
  float det = dot(sigmaX, r1) * faceDir;
  vec3 grad = sign(det) * (dHdxy.x * r1 + dHdxy.y * r2);
  return normalize(abs(det) * surfNorm - grad);
}
`;

export const LOOK_COLOR_FRAGMENT = /* glsl */ `
#include <color_fragment>
float lookGlass = 0.0;
float lookRough = 0.0;
float lookMetal = 0.0;
float lookHeight = 0.0;
float lookLit = 0.0;
if (vLookRow > -0.5) {
  LookSurface look = lookDisplay(floor(vLookRow + 0.5), vLookFace);
  vec3 tint = vColor / max(vTone, 0.01);
  diffuseColor.rgb = lookToAlbedo(look.rgb) * look.shade * lookWallLight(vTone, vLookLift) * tint;
  lookGlass = look.glass;
  lookRough = look.rough;
  lookMetal = look.metal;
  lookHeight = look.height;
  lookLit = look.lit;
}
`;

export const LOOK_ROUGHNESS_FRAGMENT = /* glsl */ `
#include <roughnessmap_fragment>
if (vLookRow > -0.5) roughnessFactor = lookRough;
`;

export const LOOK_METALNESS_FRAGMENT = /* glsl */ `
#include <metalnessmap_fragment>
if (vLookRow > -0.5) metalnessFactor = lookMetal;
`;

// Las derivadas se toman fuera del if: dentro de una rama no están definidas.
export const LOOK_NORMAL_FRAGMENT = /* glsl */ `
#include <normal_fragment_maps>
vec2 lookDH = vec2(dFdx(lookHeight), dFdy(lookHeight));
if (vLookRow > -0.5) normal = lookBump(-vViewPosition, normal, lookDH, faceDirection);
`;

export const LOOK_EMISSIVE_FRAGMENT = /* glsl */ `
#include <emissivemap_fragment>
// El interior varía por vano (unos 2,4 m de ancho y un piso de alto): unos más claros, otros casi apagados.
float lookBay = fract(sin(dot(floor(vLookFace / vec2(2.4, 3.3)), vec2(12.9898, 78.233))) * 43758.5453);
vec3 lookEmit = lookNightGlow * lookLit + lookInterior * lookGlass * (0.15 + 1.1 * lookBay * lookBay);
totalEmissiveRadiance += mix(lookEmit, vec3(dot(lookEmit, vec3(0.2126, 0.7152, 0.0722))), lookEmissiveDesat);
`;

export const LOOK_LIGHTS_FRAGMENT = /* glsl */ `
#include <lights_fragment_end>
reflectedLight.indirectSpecular *= mix(1.0, lookGlassEnv, lookGlass);
`;
