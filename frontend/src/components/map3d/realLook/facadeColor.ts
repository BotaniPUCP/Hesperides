import { DETAIL_FADE, MIN_COVERAGE, NO_BOUND_M, OPAQUE, PCG_ADD, PCG_MUL, REGION_TEXELS, SEED_MIX } from './lookLayout';
import type { LookTable } from './lookTable';

/**
 * El color de un punto de una fachada, leído de la tabla igual que lo lee el
 * shader (`lookShader.ts` hace la misma cuenta en GLSL). Lo usan las pruebas y
 * la hoja de revisión. Es el color que se ve en pantalla en una cara al sol:
 * la vuelta a albedo (`lookToAlbedo`) queda en el shader.
 */

export type Rgb = [number, number, number];
export interface FacadeSample {
  rgb: Rgb;
  /** Cuánto del punto es vidrio (el shader le da un poco de reflejo). */
  glass: number;
}
/** Tamaño de un píxel sobre la fachada, en metros a lo largo del muro y en altura. */
export type PixelSize = readonly [number, number];

const clamp01 = (x: number) => Math.min(Math.max(x, 0), 1);
const smoothstep = (a: number, b: number, x: number) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const mixRgb = (a: Rgb, b: Rgb, t: number): Rgb => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
const glslMod = (x: number, y: number) => x - y * Math.floor(x / y);
/** 1 dentro de [a, b], con bordes suavizados en `aa`: aproxima cuánto del píxel cae dentro. */
const box = (x: number, a: number, b: number, aa: number) => clamp01(smoothstep(a - aa, a + aa, x) - smoothstep(b - aa, b + aa, x));
/** 1 cerca; 0 cuando el píxel ya es una buena parte del período y conviene el promedio. */
const detail = (pixel: number, period: number) => 1 - smoothstep(DETAIL_FADE[0], DETAIL_FADE[1], pixel / period);

const TWO_32 = 4294967296;

/** pcg2d del módulo (cx, cy) con la semilla de la cara: [elige acento, tono], cada uno en [0, 1). */
export function cellHash(cx: number, cy: number, seed: number): [number, number] {
  let x = ((cx | 0) ^ Math.imul(seed, SEED_MIX[0])) >>> 0;
  let y = ((cy | 0) ^ Math.imul(seed, SEED_MIX[1])) >>> 0;
  x = (Math.imul(x, PCG_MUL) + PCG_ADD) >>> 0;
  y = (Math.imul(y, PCG_MUL) + PCG_ADD) >>> 0;
  for (let pass = 0; pass < 2; pass++) {
    x = (x + Math.imul(y, PCG_MUL)) >>> 0;
    y = (y + Math.imul(x, PCG_MUL)) >>> 0;
    x = (x ^ (x >>> 16)) >>> 0;
    y = (y ^ (y >>> 16)) >>> 0;
  }
  return [x / TWO_32, y / TWO_32];
}

const texel = (t: LookTable, i: number) => Array.from(t.data.subarray(i * 4, i * 4 + 4));
const rgbOf = (t: number[]): Rgb => [t[0], t[1], t[2]];

interface Glass { glass: Rgb; frame: Rgb; frameM: number; panel: Rgb; panelM: number; accent: Rgb; share: number; module: number; height: number; vary: number }

function readGlass(table: LookTable, m: number): Glass {
  const [t0, t1, t2, t3, t4] = [0, 1, 2, 3, 4].map((i) => texel(table, m + i));
  return { glass: rgbOf(t0), frame: rgbOf(t1), frameM: t1[3], panel: rgbOf(t2), panelM: t2[3], accent: rgbOf(t3), share: t3[3], module: t4[0], height: t4[1], vary: t4[2] };
}

/** El módulo de cerca: paño (con su tono), antepecho o acento, y perfiles. */
function glassNear(g: Glass, x: number, y: number, aa: PixelSize, seed: number): FacadeSample {
  const cx = Math.floor(x / g.module), cy = Math.floor(y / g.height);
  const fx = x - cx * g.module, fy = y - cy * g.height;
  const [accentHash, toneHash] = cellHash(cx, cy, seed);
  const accentOn = g.share > 0 && accentHash < g.share;
  const tone = 1 + g.vary * (2 * toneHash - 1);
  const pane: Rgb = accentOn && !g.panelM ? g.accent : [g.glass[0] * tone, g.glass[1] * tone, g.glass[2] * tone];
  const panel = accentOn ? g.accent : g.panel;
  const half = g.frameM / 2;
  const inPanel = g.panelM > 0 ? 1 - smoothstep(g.panelM - aa[1], g.panelM + aa[1], fy) : 0;
  const line = g.panelM > 0 ? box(fy, g.panelM - half, g.panelM + half, aa[1]) : 0;
  const frame = Math.max(1 - box(fx, half, g.module - half, aa[0]), 1 - box(fy, half, g.height - half, aa[1]), line);
  return { rgb: mixRgb(mixRgb(pane, panel, inPanel), g.frame, frame), glass: (1 - frame) * (1 - inPanel) };
}

/** El módulo de lejos: el promedio de paños, antepechos, acentos y perfiles. */
function glassFar(g: Glass): FacadeSample {
  const panelFrac = g.panelM / g.height;
  const pane = g.panelM > 0 ? g.glass : mixRgb(g.glass, g.accent, g.share);
  const panel = mixRgb(g.panel, g.accent, g.share);
  const frameFrac = clamp01(g.frameM / g.module + (g.frameM / g.height) * (g.panelM > 0 ? 2 : 1));
  return { rgb: mixRgb(mixRgb(pane, panel, panelFrac), g.frame, frameFrac), glass: (1 - frameFrac) * (1 - panelFrac) };
}

function materialColor(table: LookTable, m: number, x: number, y: number, aa: PixelSize, seed: number): FacadeSample {
  const t0 = texel(table, m);
  if (t0[3] < 0.5) return { rgb: rgbOf(t0), glass: 0 };
  const g = readGlass(table, m);
  const d = Math.min(detail(aa[0], g.module), detail(aa[1], g.height));
  const far = glassFar(g);
  if (d <= 0) return far;
  const near = glassNear(g, x, y, aa, seed);
  return { rgb: mixRgb(far.rgb, near.rgb, d), glass: mix(far.glass, near.glass, d) };
}

/** Cuánto del píxel cae en la franja del piso; lejos, la proporción del piso que ocupa. */
function floorBand(v: number, every: number, center: number, half: number, aa: number): number {
  const y = glslMod(v - center + every / 2, every) - every / 2;
  return mix((2 * half) / every, box(y, -half, half, aa), detail(aa, every));
}

function coverage(table: LookTable, r: number, u: number, v: number, aa: PixelSize): number {
  const [u0, u1, v0, v1] = texel(table, r);
  const [, every, center, half] = texel(table, r + 1);
  const c = box(u, u0, u1, aa[0]) * box(v, v0, v1, aa[1]);
  return every > 0 && c > 0 ? c * floorBand(v, every, center, half, aa[1]) : c;
}

const finite = (bound: number) => Math.abs(bound) < NO_BOUND_M / 2;

/** La retícula arranca en el borde izquierdo e inferior de su región, o al pie de la franja de su piso. */
function origin(table: LookTable, r: number): [number, number] {
  const [u0, , v0] = texel(table, r);
  const [, every, center, half] = texel(table, r + 1);
  return [finite(u0) ? u0 : 0, every > 0 ? center - half : finite(v0) ? v0 : 0];
}

interface Accumulator { rgb: Rgb; glass: number; alpha: number }

function addLayer(acc: Accumulator, s: FacadeSample, weight: number) {
  acc.rgb = [acc.rgb[0] + s.rgb[0] * weight, acc.rgb[1] + s.rgb[1] * weight, acc.rgb[2] + s.rgb[2] * weight];
  acc.glass += s.glass * weight;
  acc.alpha += weight;
}

/** De la última región a la primera, cada una tapa lo que está debajo; lo que queda a la vista es el muro. */
export function facadeColor(table: LookTable, face: number, u: number, v: number, aa: PixelSize): FacadeSample {
  const [wall, start, count, seed] = texel(table, face);
  const acc: Accumulator = { rgb: [0, 0, 0], glass: 0, alpha: 0 };
  for (let k = count - 1; k >= 0 && acc.alpha <= OPAQUE; k--) {
    const r = start + k * REGION_TEXELS;
    const c = coverage(table, r, u, v, aa);
    if (c <= MIN_COVERAGE) continue;
    const [ox, oy] = origin(table, r);
    addLayer(acc, materialColor(table, texel(table, r + 1)[0], u - ox, v - oy, aa, seed), (1 - acc.alpha) * c);
  }
  if (acc.alpha <= OPAQUE) addLayer(acc, materialColor(table, wall, u, v, aa, seed), 1 - acc.alpha);
  return { rgb: [acc.rgb[0] / acc.alpha, acc.rgb[1] / acc.alpha, acc.rgb[2] / acc.alpha], glass: acc.glass / acc.alpha };
}
