import { ROW_TEXELS } from './lookTable';

/**
 * GLSL del patrón de fachadas. Cada vértice trae su fila de la tabla (`aLookRow`),
 * sus coordenadas sobre la cara (`aLookFace`: metros a lo largo del muro y cota)
 * y el tono con que lo pinta `paintPoly` (`aTone`), para quitarlo: el modo real no
 * usa el degradado del modo rosado, pero sí el tinte del resaltado.
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
uniform sampler2D lookAtlas;
uniform float lookRows;
varying float vLookRow;
varying vec2 vLookFace;
varying float vTone;

vec4 lookTexel(float row, float i) {
  return texture2D(lookTable, vec2((i + 0.5) / ${ROW_TEXELS.toFixed(1)}, (row + 0.5) / lookRows));
}

float lookBox(float x, float a, float b, float aa) {
  return clamp(smoothstep(a - aa, a + aa, x) - smoothstep(b - aa, b + aa, x), 0.0, 1.0);
}

// Un piso del patrón: muro, vidrio, marcos y canto de losa. Lejos, el promedio, para que no titile.
vec3 lookFloor(float row, vec2 f, vec2 aa, out float glass) {
  vec4 t0 = lookTexel(row, 0.0), t1 = lookTexel(row, 1.0), t2 = lookTexel(row, 2.0);
  vec4 t3 = lookTexel(row, 3.0), t4 = lookTexel(row, 4.0), t5 = lookTexel(row, 5.0);
  float kind = t0.a, floorM = t1.a, sill = t2.a, win = t3.a;
  float width = t4.x, module = t4.y, frameM = t4.w, bandM = t5.x;
  float y = mod(f.y - t5.y, floorM);
  float x = mod(f.x - t4.z, module);
  float glassMask = 0.0, frameMask = 0.0, coverage = 0.0;
  if (kind > 0.5 && kind < 1.5) {
    float outer = lookBox(y, sill, sill + win, aa.y) * lookBox(x, 0.0, width, aa.x);
    float inner = lookBox(y, sill + frameM, sill + win - frameM, aa.y) * lookBox(x, frameM, width - frameM, aa.x);
    glassMask = inner;
    frameMask = max(outer - inner, 0.0);
    coverage = (win / floorM) * (width / module);
  } else if (kind > 1.5 && kind < 2.5) {
    float strip = lookBox(y, sill, sill + win, aa.y);
    float mullion = 1.0 - lookBox(x, frameM * 0.5, module - frameM * 0.5, aa.x);
    float rails = 1.0 - lookBox(y, sill + frameM, sill + win - frameM, aa.y);
    frameMask = strip * max(mullion, rails);
    glassMask = max(strip - frameMask, 0.0);
    coverage = win / floorM;
  } else if (kind > 2.5) {
    float mullion = 1.0 - lookBox(x, frameM * 0.5, module - frameM * 0.5, aa.x);
    float transom = 1.0 - lookBox(y, frameM, floorM - frameM, aa.y);
    frameMask = max(mullion, transom);
    glassMask = 1.0 - frameMask;
    coverage = 0.9;
  }
  float bandMask = bandM > 0.0 ? 1.0 - smoothstep(bandM - aa.y, bandM + aa.y, y) : 0.0;
  vec3 near = mix(mix(mix(t0.rgb, t2.rgb, frameMask), t1.rgb, glassMask), t3.rgb, bandMask);
  vec3 far = mix(mix(t0.rgb, t1.rgb, coverage), t3.rgb, bandM / floorM);
  float detail = 1.0 - smoothstep(0.2, 0.5, max(aa.x / module, aa.y / floorM));
  glass = glassMask * (1.0 - bandMask) * detail;
  return mix(far, near, detail);
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

// Un tramo de foto repetido a lo largo del muro; sobre su alto, el color del muro. El gradiente se toma
// de las coordenadas sin envolver para que el corte de cada repetición no deje una costura.
// outside: el punto cae fuera de un tramo que no se repite (casilla del módulo en 0).
vec3 lookPhoto(float row, vec2 f, out bool outside) {
  vec4 t0 = lookTexel(row, 0.0), t1 = lookTexel(row, 1.0), t4 = lookTexel(row, 4.0);
  vec4 t5 = lookTexel(row, 5.0), t7 = lookTexel(row, 7.0);
  vec2 q = vec2((f.x - t4.z) / t4.x, (f.y - t5.y) / t1.a);
  outside = t4.y < 0.5 && (q.x < 0.0 || q.x > 1.0 || q.y < 0.0);
  if (outside || q.y > 1.0) return t0.rgb;
  vec2 uv = t7.xy + t7.zw * vec2(t4.y < 0.5 ? q.x : fract(q.x), clamp(q.y, 0.0, 1.0));
  vec3 c = textureGrad(lookAtlas, uv, dFdx(q) * t7.zw, dFdy(q) * t7.zw).rgb;
  // el color clave (magenta) marca cielo y follaje: ahí la cara toma lo que sigue fuera del tramo
  outside = c.r - c.g > 0.22 && c.b - c.g > 0.22;
  return c;
}

vec3 lookFace(float row, vec2 f, vec2 aa, out float glass) {
  if (lookTexel(row, 0.0).a < 3.5) return lookFloor(row, f, aa, glass);
  glass = 0.0;
  bool outside;
  vec3 c = lookPhoto(row, f, outside);
  float beyond = lookTexel(row, 2.0).a;
  if (!outside || beyond < -0.5) return c;
  if (lookTexel(beyond, 0.0).a > 3.5) return lookPhoto(beyond, f, outside);
  return lookFloor(beyond, f, aa, glass);
}

vec3 lookDisplay(float row, vec2 f, out float glass) {
  vec2 aa = max(fwidth(f), vec2(1e-4));
  vec4 t0 = lookTexel(row, 0.0), t5 = lookTexel(row, 5.0), t6 = lookTexel(row, 6.0);
  glass = 0.0;
  if (t0.a < 3.5 && f.y < t6.a) return t6.rgb;
  if (t5.z > -0.5 && f.y < t5.y) return lookFace(t5.z, f, aa, glass);
  return lookFace(row, f, aa, glass);
}

vec3 lookAlbedo(float row, vec2 f, out float glass) {
  return lookToAlbedo(lookDisplay(row, f, glass));
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

/** El vidrio refleja un poco; muros, losas y techos quedan mates (D-13). */
export const LOOK_ROUGHNESS_FRAGMENT = /* glsl */ `
#include <roughnessmap_fragment>
roughnessFactor = mix(roughnessFactor, 0.5, lookGlass);
`;
