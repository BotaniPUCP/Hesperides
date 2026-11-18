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
/** Cuánto se hunde el paño respecto de la fachada, en metros (0: al ras, el modo de siempre). */
uniform float lookPaneInset;
/** Cuánto se oscurece la base de cada pared (los primeros metros sobre el suelo); 0, nada. */
uniform float lookContact;
/** La rugosidad de los techos (caras que miran arriba); negativa, la de la ficha. */
uniform float lookRoofRough;
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
// Contacto con el suelo: también apaga reflejos y luz emitida (un vestíbulo de vidrio brilla por eso, no por su color).
float lookContactF = 1.0;
// Las derivadas para el vano hundido, fuera de cualquier rama.
vec3 lookDpx = dFdx(-vViewPosition), lookDpy = dFdy(-vViewPosition);
vec2 lookDux = dFdx(vLookFace), lookDuy = dFdy(vLookFace);
if (vLookRow > -0.5) {
  LookSurface look = lookDisplay(floor(vLookRow + 0.5), vLookFace);
  vec3 tint = vColor / max(vTone, 0.01);
  diffuseColor.rgb = lookToAlbedo(look.rgb) * look.shade * lookWallLight(vTone, vLookLift) * tint;
  // Contacto con el suelo: la base de la pared, más oscura que su centro.
  lookContactF = 1.0 - lookContact * (1.0 - smoothstep(0.0, 8.0, vLookLift));
  diffuseColor.rgb *= lookContactF;
  lookGlass = look.glass;
  lookRough = look.rough;
  lookMetal = look.metal;
  lookHeight = look.height;
  lookLit = look.lit;
  // Vano hundido: el rayo de la mirada, ya dentro del vano, choca con el vidrio o con su costado. El costado (jamba,
  // dintel, alféizar) se ve según el ángulo de la cámara y queda en sombra.
  float lookDet = lookDux.x * lookDuy.y - lookDux.y * lookDuy.x;
  if (lookPaneInset > 0.0 && lookPaneW > 0.0 && abs(lookDet) > 1e-10) {
    vec3 lookT = normalize((lookDpx * lookDuy.y - lookDpy * lookDux.y) / lookDet);
    vec3 lookB = normalize((lookDpy * lookDux.x - lookDpx * lookDuy.x) / lookDet);
    vec3 lookV = normalize(vViewPosition);
    vec3 lookN = normalize(cross(lookT, lookB));
    vec3 lookVt = vec3(dot(lookV, lookT), dot(lookV, lookB), max(abs(dot(lookV, lookN)), 0.15));
    vec2 lookHit = lookPaneF - lookVt.xy / lookVt.z * lookPaneInset;
    vec4 r = lookPaneRect;
    float onPane = lookBox(lookPaneF.x, r.x, r.y, 0.01) * lookBox(lookPaneF.y, r.z, r.w, 0.01);
    float seesGlass = lookBox(lookHit.x, r.x, r.y, 0.01) * lookBox(lookHit.y, r.z, r.w, 0.01);
    float jamb = onPane * (1.0 - seesGlass) * lookPaneW;
    diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.0 + vec3(0.35, 0.33, 0.31) * tint, jamb);
    lookGlass *= 1.0 - jamb;
    lookLit *= 1.0 - jamb;
    lookRough = mix(lookRough, 0.85, jamb);
    lookMetal = mix(lookMetal, 0.0, jamb);
  }
}
`;

export const LOOK_ROUGHNESS_FRAGMENT = /* glsl */ `
#include <roughnessmap_fragment>
if (vLookRow > -0.5) roughnessFactor = lookRough;
// Techos: la normal de la cara mira arriba (en la vista, hacia el «arriba» de la escena).
if (vLookRow > -0.5 && lookRoofRough >= 0.0) {
  float lookRoofness = smoothstep(0.6, 0.85, dot(normalize(vNormal), normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz)));
  roughnessFactor = mix(roughnessFactor, lookRoofRough, lookRoofness * (1.0 - lookGlass));
}
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
totalEmissiveRadiance += mix(lookEmit, vec3(dot(lookEmit, vec3(0.2126, 0.7152, 0.0722))), lookEmissiveDesat) * lookContactF;
`;

export const LOOK_LIGHTS_FRAGMENT = /* glsl */ `
#include <lights_fragment_end>
reflectedLight.indirectSpecular *= mix(1.0, lookGlassEnv, lookGlass) * lookContactF;
reflectedLight.directSpecular *= lookContactF;
`;
