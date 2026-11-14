import { LAYOUT_GLSL } from './lookLayout';

/**
 * GLSL de las fachadas (SPEC-112). Hace la misma cuenta que `facadeColor.ts`,
 * que es la copia que se prueba. Cada vértice trae el texel de su cara
 * (`aLookRow`), sus coordenadas sobre la cara (`aLookFace`: metros a lo largo
 * del muro y cota) y el tono con que lo pinta `paintPoly` (`aTone`), para
 * quitarlo: el modo real no usa el degradado del modo rosado, pero sí el tinte
 * del resaltado.
 */

export const LOOK_VERTEX_HEAD = /* glsl */ `
attribute float aLookRow;
attribute vec2 aLookFace;
attribute float aTone;
varying float vLookRow;
varying vec2 vLookFace;
varying float vTone;
`;

export const LOOK_VERTEX_BODY = /* glsl */ `
vLookRow = aLookRow;
vLookFace = aLookFace;
vTone = aTone;
`;

export const LOOK_FRAGMENT_HEAD = /* glsl */ `
uniform sampler2D lookTable;
uniform float lookRows;
varying float vLookRow;
varying vec2 vLookFace;
varying float vTone;
${LAYOUT_GLSL}

vec4 lookAt(float i) {
  float y = floor((i + 0.5) / LOOK_TABLE_WIDTH);
  float x = i - y * LOOK_TABLE_WIDTH;
  return texture2D(lookTable, vec2((x + 0.5) / LOOK_TABLE_WIDTH, (y + 0.5) / lookRows));
}

float lookBox(float x, float a, float b, float aa) {
  return clamp(smoothstep(a - aa, a + aa, x) - smoothstep(b - aa, b + aa, x), 0.0, 1.0);
}

float lookDetail(float pixel, float period) {
  return 1.0 - smoothstep(LOOK_FADE_FROM, LOOK_FADE_TO, pixel / period);
}

// pcg2d del módulo con la semilla de la cara: x elige el acento, y da el tono. Es de enteros para que dé lo
// mismo que cellHash en TypeScript; en WebGL1 no hay enteros sin signo y queda uno de floats, solo parecido.
#if __VERSION__ >= 300
vec2 lookCellHash(vec2 cell, float seed) {
  uint s = uint(seed);
  uvec2 v = uvec2(ivec2(cell)) ^ uvec2(s * LOOK_SEED_MIX_X, s * LOOK_SEED_MIX_Y);
  v = v * LOOK_PCG_MUL + LOOK_PCG_ADD;
  for (int pass = 0; pass < 2; pass++) {
    v.x += v.y * LOOK_PCG_MUL;
    v.y += v.x * LOOK_PCG_MUL;
    v = v ^ (v >> 16u);
  }
  return vec2(v) * (1.0 / 4294967296.0);
}
#else
float lookHash1(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
vec2 lookCellHash(vec2 cell, float seed) {
  vec2 p = cell + mod(seed, 61.0) * vec2(1.7, 3.1);
  return vec2(lookHash1(p), lookHash1(p + vec2(17.0, 31.0)));
}
#endif

// El módulo de vidrio de cerca: paño con su tono, antepecho o acento, y perfiles.
vec3 lookGlassNear(float m, vec2 p, vec2 aa, float seed, out float glass) {
  vec4 t0 = lookAt(m), t1 = lookAt(m + 1.0), t2 = lookAt(m + 2.0), t3 = lookAt(m + 3.0), t4 = lookAt(m + 4.0);
  vec2 size = t4.xy;
  vec2 cell = floor(p / size);
  vec2 f = p - cell * size;
  vec2 h = lookCellHash(cell, seed);
  bool accentOn = t3.a > 0.0 && h.x < t3.a;
  float tone = 1.0 + t4.z * (2.0 * h.y - 1.0);
  vec3 pane = accentOn && t2.a <= 0.0 ? t3.rgb : t0.rgb * tone;
  vec3 panel = accentOn ? t3.rgb : t2.rgb;
  float halfFrame = t1.a * 0.5;
  float inPanel = t2.a > 0.0 ? 1.0 - smoothstep(t2.a - aa.y, t2.a + aa.y, f.y) : 0.0;
  float rail = t2.a > 0.0 ? lookBox(f.y, t2.a - halfFrame, t2.a + halfFrame, aa.y) : 0.0;
  float frame = max(max(1.0 - lookBox(f.x, halfFrame, size.x - halfFrame, aa.x), 1.0 - lookBox(f.y, halfFrame, size.y - halfFrame, aa.y)), rail);
  glass = (1.0 - frame) * (1.0 - inPanel);
  return mix(mix(pane, panel, inPanel), t1.rgb, frame);
}

// El módulo de lejos: el promedio de paños, antepechos, acentos y perfiles, para que no titile.
vec3 lookGlassFar(float m, out float glass) {
  vec4 t0 = lookAt(m), t1 = lookAt(m + 1.0), t2 = lookAt(m + 2.0), t3 = lookAt(m + 3.0), t4 = lookAt(m + 4.0);
  float panelFrac = t2.a / t4.y;
  vec3 pane = t2.a > 0.0 ? t0.rgb : mix(t0.rgb, t3.rgb, t3.a);
  vec3 panel = mix(t2.rgb, t3.rgb, t3.a);
  float frameFrac = clamp(t1.a / t4.x + (t1.a / t4.y) * (t2.a > 0.0 ? 2.0 : 1.0), 0.0, 1.0);
  glass = (1.0 - frameFrac) * (1.0 - panelFrac);
  return mix(mix(pane, panel, panelFrac), t1.rgb, frameFrac);
}

vec3 lookMaterial(float m, vec2 p, vec2 aa, float seed, out float glass) {
  vec4 t0 = lookAt(m);
  glass = 0.0;
  if (t0.a < 0.5) return t0.rgb;
  vec2 size = lookAt(m + 4.0).xy;
  float d = min(lookDetail(aa.x, size.x), lookDetail(aa.y, size.y));
  float farGlass;
  vec3 far = lookGlassFar(m, farGlass);
  glass = farGlass;
  if (d <= 0.0) return far;
  float nearGlass;
  vec3 near = lookGlassNear(m, p, aa, seed, nearGlass);
  glass = mix(farGlass, nearGlass, d);
  return mix(far, near, d);
}

// Cuánto del píxel cae en la franja del piso; lejos, la proporción del piso que ocupa.
float lookFloorBand(float v, vec4 band, float aa) {
  float y = mod(v - band.z + band.y * 0.5, band.y) - band.y * 0.5;
  return mix(2.0 * band.w / band.y, lookBox(y, -band.w, band.w, aa), lookDetail(aa, band.y));
}

// De la última región a la primera, cada una tapa lo que está debajo; lo que queda a la vista es el muro.
vec3 lookDisplay(float face, vec2 f, out float glass) {
  vec2 aa = max(fwidth(f), vec2(1e-4));
  vec4 rec = lookAt(face);
  vec3 color = vec3(0.0);
  float alpha = 0.0;
  float g;
  glass = 0.0;
  for (int k = 0; k < LOOK_MAX_REGIONS; k++) {
    float i = rec.z - 1.0 - float(k);
    if (i < 0.0 || alpha > LOOK_OPAQUE) break;
    float r = rec.y + i * LOOK_REGION_TEXELS;
    vec4 span = lookAt(r);
    vec4 band = lookAt(r + 1.0);
    float c = lookBox(f.x, span.x, span.y, aa.x) * lookBox(f.y, span.z, span.w, aa.y);
    if (band.y > 0.0 && c > 0.0) c *= lookFloorBand(f.y, band, aa.y);
    if (c <= LOOK_MIN_COVERAGE) continue;
    float ox = abs(span.x) < LOOK_NO_BOUND * 0.5 ? span.x : 0.0;
    float oy = band.y > 0.0 ? band.z - band.w : (abs(span.z) < LOOK_NO_BOUND * 0.5 ? span.z : 0.0);
    vec3 m = lookMaterial(band.x, f - vec2(ox, oy), aa, rec.w, g);
    float w = (1.0 - alpha) * c;
    color += m * w;
    glass += g * w;
    alpha += w;
  }
  if (alpha <= LOOK_OPAQUE) {
    vec3 m = lookMaterial(rec.x, f, aa, rec.w, g);
    float w = 1.0 - alpha;
    color += m * w;
    glass += g * w;
    alpha += w;
  }
  glass /= alpha;
  return color / alpha;
}

// La escena aclara los oscuros y entibia todo (luz cálida, exposición y ACES). Se invierte esa curva para que
// el color de la ficha sea el que se ve en pantalla; LOOK_GAIN se midió en una cara vertical al sol (SPEC-109 D-07).
const vec3 LOOK_GAIN = vec3(1.33, 1.25, 1.10);
vec3 lookToAlbedo(vec3 t) {
  t = clamp(t, 0.0, 0.97);
  vec3 a = 2.43 * t - 2.51, b = 0.59 * t - 0.03, c = 0.14 * t;
  vec3 x = (-b - sqrt(max(b * b - 4.0 * a * c, 0.0))) / (2.0 * a);
  return x / LOOK_GAIN;
}

vec3 lookAlbedo(float face, vec2 f, out float glass) {
  return lookToAlbedo(lookDisplay(face, f, glass));
}
`;

export const LOOK_COLOR_FRAGMENT = /* glsl */ `
#include <color_fragment>
float lookGlass = 0.0;
if (vLookRow > -0.5) {
  vec3 tint = vColor / max(vTone, 0.01);
  diffuseColor.rgb = lookAlbedo(floor(vLookRow + 0.5), vLookFace, lookGlass) * tint;
}
`;

/** El vidrio refleja un poco; muros, losas y techos quedan mates (SPEC-109 D-13). */
export const LOOK_ROUGHNESS_FRAGMENT = /* glsl */ `
#include <roughnessmap_fragment>
roughnessFactor = mix(roughnessFactor, 0.5, lookGlass);
`;
