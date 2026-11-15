import { FINISH_GLSL } from './finishes';
import { LOOK_FINISH_GLSL } from './lookFinishShader';
import { LOOK_GLASS_GLSL } from './lookGlassShader';
import { LAYOUT_GLSL } from './lookLayout';
import { WALL_LIGHT_GLSL } from './wallLight';

/**
 * GLSL de las fachadas (SPEC-112). Hace la misma cuenta que `facadeColor.ts`,
 * que es la copia que se prueba. Cada vértice trae el texel de su cara
 * (`aLookRow`), sus coordenadas sobre la cara (`aLookFace`: metros a lo largo
 * del muro y cota), el tono con que lo pinta `paintPoly` (`aTone`) y su altura
 * sobre la base del edificio (`aLookLift`). Del tono se quita el degradado del
 * modo rosado y se vuelve a poner una parte (`lookWallLight`, D-16); el tinte
 * del resaltado se conserva.
 */

export const LOOK_VERTEX_HEAD = /* glsl */ `
attribute float aLookRow;
attribute vec2 aLookFace;
attribute float aTone;
attribute float aLookLift;
varying float vLookRow;
varying vec2 vLookFace;
varying float vTone;
varying float vLookLift;
`;

export const LOOK_VERTEX_BODY = /* glsl */ `
vLookRow = aLookRow;
vLookFace = aLookFace;
vTone = aTone;
vLookLift = aLookLift;
`;

const LOOK_CORE_GLSL = /* glsl */ `
uniform sampler2D lookTable;
uniform float lookRows;
varying float vLookRow;
varying vec2 vLookFace;
varying float vTone;
varying float vLookLift;
${LAYOUT_GLSL}
${FINISH_GLSL}

// Un punto de la fachada: su color de ficha y cómo toma la luz (SPEC-112 D-17 a D-19).
struct LookSurface { vec3 rgb; float glass; float shade; float height; float rough; float metal; float lit; };

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
`;

const LOOK_DISPLAY_GLSL = /* glsl */ `
LookSurface lookBlend(LookSurface a, LookSurface b, float t) {
  LookSurface s;
  s.rgb = mix(a.rgb, b.rgb, t);
  s.glass = mix(a.glass, b.glass, t);
  s.shade = mix(a.shade, b.shade, t);
  s.height = mix(a.height, b.height, t);
  s.rough = mix(a.rough, b.rough, t);
  s.metal = mix(a.metal, b.metal, t);
  s.lit = mix(a.lit, b.lit, t);
  return s;
}

// Un liso: su color, su grano y la luz de su acabado (segundo texel). El grano va en coordenadas de la cara.
LookSurface lookSolid(vec4 t0, vec4 t1, vec2 f, vec2 aa, float seed) {
  vec2 g = lookGrain(t1.x, f, aa, seed);
  LookSurface s;
  s.rgb = t0.rgb;
  s.glass = 0.0;
  s.shade = g.x;
  s.height = g.y;
  s.rough = t1.y;
  s.metal = t1.z;
  s.lit = 0.0;
  return s;
}

// La retícula del vidrio arranca en el origen de su región (o).
LookSurface lookMaterial(float m, vec2 f, vec2 o, vec2 aa, float seed) {
  vec4 t0 = lookAt(m);
  if (t0.a < 0.5) return lookSolid(t0, lookAt(m + 1.0), f, aa, seed);
  vec2 size = lookAt(m + 4.0).xy;
  float d = min(lookDetail(aa.x, size.x), lookDetail(aa.y, size.y));
  LookSurface far = lookGlassFar(m);
  if (d <= 0.0) return far;
  return lookBlend(far, lookGlassNear(m, f - o, aa, seed), d);
}

// Cuánto del píxel cae en la franja del piso; lejos, la proporción del piso que ocupa.
float lookFloorBand(float v, vec4 band, float aa) {
  float y = mod(v - band.z + band.y * 0.5, band.y) - band.y * 0.5;
  return mix(2.0 * band.w / band.y, lookBox(y, -band.w, band.w, aa), lookDetail(aa, band.y));
}

void lookAdd(inout LookSurface acc, LookSurface s, float w) {
  acc.rgb += s.rgb * w;
  acc.glass += s.glass * w;
  acc.shade += s.shade * w;
  acc.height += s.height * w;
  acc.rough += s.rough * w;
  acc.metal += s.metal * w;
  acc.lit += s.lit * w;
}

// De la última región a la primera, cada una tapa lo que está debajo; lo que queda a la vista es el muro.
LookSurface lookDisplay(float face, vec2 f) {
  vec2 aa = max(fwidth(f), vec2(1e-4));
  vec4 rec = lookAt(face);
  LookSurface acc = LookSurface(vec3(0.0), 0.0, 0.0, 0.0, 0.0, 0.0, 0.0);
  float alpha = 0.0;
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
    float w = (1.0 - alpha) * c;
    lookAdd(acc, lookMaterial(band.x, f, vec2(ox, oy), aa, rec.w), w);
    alpha += w;
  }
  if (alpha <= LOOK_OPAQUE) {
    float w = 1.0 - alpha;
    lookAdd(acc, lookMaterial(rec.x, f, vec2(0.0), aa, rec.w), w);
    alpha += w;
  }
  float inv = 1.0 / alpha;
  acc.rgb *= inv;
  acc.glass *= inv;
  acc.shade *= inv;
  acc.height *= inv;
  acc.rough *= inv;
  acc.metal *= inv;
  acc.lit *= inv;
  return acc;
}
`;

const LOOK_ALBEDO_GLSL = /* glsl */ `
// La escena aclara los oscuros y entibia todo (luz cálida, exposición y ACES). Se invierte esa curva para que
// el color de la ficha sea el que se ve en pantalla; LOOK_GAIN se midió en una cara vertical al sol (SPEC-109 D-07).
const vec3 LOOK_GAIN = vec3(1.33, 1.25, 1.10);
vec3 lookToAlbedo(vec3 t) {
  t = clamp(t, 0.0, 0.97);
  vec3 a = 2.43 * t - 2.51, b = 0.59 * t - 0.03, c = 0.14 * t;
  vec3 x = (-b - sqrt(max(b * b - 4.0 * a * c, 0.0))) / (2.0 * a);
  return x / LOOK_GAIN;
}
`;

export const LOOK_FRAGMENT_HEAD = [LOOK_CORE_GLSL, LOOK_FINISH_GLSL, LOOK_GLASS_GLSL, LOOK_DISPLAY_GLSL, LOOK_ALBEDO_GLSL, WALL_LIGHT_GLSL].join('\n');
