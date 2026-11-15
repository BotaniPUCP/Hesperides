import { GLASS_LIGHT, GLASS_NIGHT, LIT_MEAN } from './finishes';
import { finishGrain } from './finishGrain';
import { panelPillow, paneGloss, type Gloss, type Rect } from './glassGloss';
import { MIN_COVERAGE, NO_BOUND_M, OPAQUE, REGION_TEXELS } from './lookLayout';
import { box, cellHash, clamp01, detail, glslMod, mix, smoothstep } from './lookMath';
import type { LookTable } from './lookTable';

export { cellHash } from './lookMath';

/**
 * Un punto de una fachada, leído de la tabla igual que lo lee el shader
 * (`lookShader.ts` hace la misma cuenta en GLSL). Lo usan las pruebas y la hoja
 * de revisión. `rgb` es el color que se ve en pantalla en una cara al sol: la
 * vuelta a albedo (`lookToAlbedo`) queda en el shader. Lo demás es cómo toma
 * la luz (SPEC-112 D-17 a D-19).
 */

export type Rgb = [number, number, number];
export interface FacadeSample {
  rgb: Rgb;
  /** Cuánto del punto es paño de vidrio. */
  glass: number;
  /** El grano del acabado sobre el color: promedio 1 (D-17). */
  shade: number;
  /** Altura del relieve en metros, para el bump. */
  height: number;
  rough: number;
  metal: number;
  /** Cuánto del punto es un paño que se enciende de noche (D-19). */
  lit: number;
}
/** Tamaño de un píxel sobre la fachada, en metros a lo largo del muro y en altura. */
export type PixelSize = readonly [number, number];

const mixRgb = (a: Rgb, b: Rgb, t: number): Rgb => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
const texel = (t: LookTable, i: number) => Array.from(t.data.subarray(i * 4, i * 4 + 4));
const rgbOf = (t: number[]): Rgb => [t[0], t[1], t[2]];

interface Glass { glass: Rgb; frame: Rgb; frameM: number; panel: Rgb; panelM: number; accent: Rgb; share: number; module: number; height: number; vary: number }

function readGlass(table: LookTable, m: number): Glass {
  const [t0, t1, t2, t3, t4] = [0, 1, 2, 3, 4].map((i) => texel(table, m + i));
  return { glass: rgbOf(t0), frame: rgbOf(t1), frameM: t1[3], panel: rgbOf(t2), panelM: t2[3], accent: rgbOf(t3), share: t3[3], module: t4[0], height: t4[1], vary: t4[2] };
}

/** Paño y perfil: rugosidad y metal según cuánto del punto es paño. */
function glassSample(rgb: Rgb, glass: number, lit: number, gloss: Gloss = { shade: 1, height: 0 }): FacadeSample {
  const { pane, frame } = GLASS_LIGHT;
  return { rgb, glass, ...gloss, rough: mix(frame.rough, pane.rough, glass), metal: mix(frame.metal, pane.metal, glass), lit };
}

/** El brillo y el relieve del módulo (D-23): paño hundido con reflejo, antepecho y acento abombados, perfil al ras. */
function moduleGloss(g: Glass, fx: number, fy: number, aa: PixelSize, accentPane: boolean, inPanel: number, frame: number): Gloss {
  const half = g.frameM / 2;
  const pane: Rect = [half, g.module - half, g.panelM > 0 ? g.panelM + half : half, g.height - half];
  const paneG = accentPane ? { shade: 1, height: panelPillow(fx, fy, pane, aa) } : paneGloss(fx, fy, pane, aa);
  const panelH = g.panelM > 0 ? panelPillow(fx, fy, [half, g.module - half, half, g.panelM - half], aa) : 0;
  return { shade: mix(mix(paneG.shade, 1, inPanel), 1, frame), height: (1 - frame) * mix(paneG.height, panelH, inPanel) };
}

/** El módulo de cerca: paño (con su tono), antepecho o acento, y perfiles. Un paño de acento no se enciende. */
function glassNear(g: Glass, x: number, y: number, aa: PixelSize, seed: number): FacadeSample {
  const cx = Math.floor(x / g.module), cy = Math.floor(y / g.height);
  const fx = x - cx * g.module, fy = y - cy * g.height;
  const [accentHash, toneHash] = cellHash(cx, cy, seed);
  const accentOn = g.share > 0 && accentHash < g.share;
  const tone = 1 + g.vary * (2 * toneHash - 1);
  const accentPane = accentOn && !g.panelM;
  const pane: Rgb = accentPane ? g.accent : [g.glass[0] * tone, g.glass[1] * tone, g.glass[2] * tone];
  const panel = accentOn ? g.accent : g.panel;
  const half = g.frameM / 2;
  const inPanel = g.panelM > 0 ? 1 - smoothstep(g.panelM - aa[1], g.panelM + aa[1], fy) : 0;
  const line = g.panelM > 0 ? box(fy, g.panelM - half, g.panelM + half, aa[1]) : 0;
  const frame = Math.max(1 - box(fx, half, g.module - half, aa[0]), 1 - box(fy, half, g.height - half, aa[1]), line);
  const glass = (1 - frame) * (1 - inPanel);
  const [litHash, litLevel] = cellHash(cx, cy, seed + GLASS_NIGHT.seed);
  const litOn = !accentPane && litHash < GLASS_NIGHT.share;
  const lit = litOn ? glass * mix(GLASS_NIGHT.dim, 1, litLevel) : 0;
  const gloss = moduleGloss(g, fx, fy, aa, accentPane, inPanel, frame);
  return glassSample(mixRgb(mixRgb(pane, panel, inPanel), g.frame, frame), glass, lit, gloss);
}

/** El módulo de lejos: el promedio de paños, antepechos, acentos, perfiles y paños encendidos. */
function glassFar(g: Glass): FacadeSample {
  const panelFrac = g.panelM / g.height;
  const pane = g.panelM > 0 ? g.glass : mixRgb(g.glass, g.accent, g.share);
  const panel = mixRgb(g.panel, g.accent, g.share);
  const frameFrac = clamp01(g.frameM / g.module + (g.frameM / g.height) * (g.panelM > 0 ? 2 : 1));
  const glass = (1 - frameFrac) * (1 - panelFrac);
  const lit = glass * GLASS_NIGHT.share * LIT_MEAN * (g.panelM > 0 ? 1 : 1 - g.share);
  return glassSample(mixRgb(mixRgb(pane, panel, panelFrac), g.frame, frameFrac), glass, lit);
}

function blend(a: FacadeSample, b: FacadeSample, t: number): FacadeSample {
  return {
    rgb: mixRgb(a.rgb, b.rgb, t), glass: mix(a.glass, b.glass, t), shade: mix(a.shade, b.shade, t), height: mix(a.height, b.height, t),
    rough: mix(a.rough, b.rough, t), metal: mix(a.metal, b.metal, t), lit: mix(a.lit, b.lit, t),
  };
}

/** Un liso: su color, su grano y la luz de su acabado (segundo texel). */
function solidSample(t0: number[], t1: number[], x: number, y: number, aa: PixelSize, seed: number): FacadeSample {
  const grain = finishGrain(t1[0], x, y, aa, seed);
  return { rgb: rgbOf(t0), glass: 0, shade: grain.shade, height: grain.height, rough: t1[1], metal: t1[2], lit: 0 };
}

function materialSample(table: LookTable, m: number, x: number, y: number, aa: PixelSize, seed: number): FacadeSample {
  const t0 = texel(table, m);
  if (t0[3] < 0.5) return solidSample(t0, texel(table, m + 1), x, y, aa, seed);
  const g = readGlass(table, m);
  const d = Math.min(detail(aa[0], g.module), detail(aa[1], g.height));
  const far = glassFar(g);
  return d <= 0 ? far : blend(far, glassNear(g, x, y, aa, seed), d);
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

const KEYS = ['glass', 'shade', 'height', 'rough', 'metal', 'lit'] as const;

/** Lo que se acumula de una capa a otra: cada campo pesado por su cobertura. */
function addLayer(acc: FacadeSample & { alpha: number }, s: FacadeSample, weight: number) {
  acc.rgb = [acc.rgb[0] + s.rgb[0] * weight, acc.rgb[1] + s.rgb[1] * weight, acc.rgb[2] + s.rgb[2] * weight];
  KEYS.forEach((k) => { acc[k] += s[k] * weight; });
  acc.alpha += weight;
}

/**
 * De la última región a la primera, cada una tapa lo que está debajo; lo que queda a la vista es el muro. El
 * grano se mide desde el origen de la cara, como el del muro, para que no salte en el borde de una región.
 */
export function facadeColor(table: LookTable, face: number, u: number, v: number, aa: PixelSize): FacadeSample {
  const [wall, start, count, seed] = texel(table, face);
  const acc = { rgb: [0, 0, 0] as Rgb, glass: 0, shade: 0, height: 0, rough: 0, metal: 0, lit: 0, alpha: 0 };
  for (let k = count - 1; k >= 0 && acc.alpha <= OPAQUE; k--) {
    const r = start + k * REGION_TEXELS;
    const c = coverage(table, r, u, v, aa);
    if (c <= MIN_COVERAGE) continue;
    const [ox, oy] = origin(table, r);
    const m = texel(table, r + 1)[0];
    const s = texel(table, m)[3] < 0.5 ? materialSample(table, m, u, v, aa, seed) : materialSample(table, m, u - ox, v - oy, aa, seed);
    addLayer(acc, s, (1 - acc.alpha) * c);
  }
  if (acc.alpha <= OPAQUE) addLayer(acc, materialSample(table, wall, u, v, aa, seed), 1 - acc.alpha);
  const a = acc.alpha;
  return {
    rgb: [acc.rgb[0] / a, acc.rgb[1] / a, acc.rgb[2] / a], glass: acc.glass / a, shade: acc.shade / a, height: acc.height / a,
    rough: acc.rough / a, metal: acc.metal / a, lit: acc.lit / a,
  };
}
