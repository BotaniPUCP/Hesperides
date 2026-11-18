import { GLASS_GLOSS } from './finishes';
import { box, clamp01, detail, mix, smoothstep } from './lookMath';
import type { PixelSize } from './facadeColor';

/**
 * El brillo y el relieve de un módulo de vidrio de cerca (SPEC-112 D-23): el
 * paño lleva un degradado y dos franjas de reflejo en diagonal, y queda
 * hundido con un bisel; el antepecho y el paño de acento quedan abombados.
 * Todo se funde de lejos. `lookGlassShader.ts` hace la misma cuenta en GLSL.
 */

/** Un rectángulo en coordenadas del módulo: x0, x1, y0, y1. */
export type Rect = readonly [number, number, number, number];
export interface Gloss { shade: number; height: number }

/** La coordenada diagonal del paño: constante a lo largo de una línea «/», de 0 (abajo a la izquierda) a 1. */
const diagonal = (px: number, py: number) => (px - 0.5 * py + 0.5) / 1.5;

/** Cuánto de una franja de reflejo cae en t, con su borde suave. */
export function streakAt(t: number, aaT: number): number {
  return Math.max(...GLASS_GLOSS.streaks.map(([a, b]) => box(t, a, b, aaT + GLASS_GLOSS.soft)));
}

/** La parte de t que cubren las franjas: el promedio del reflejo cuando t recorre todo su tramo. */
export const STREAK_SHARE = GLASS_GLOSS.streaks.reduce((s, [a, b]) => s + b - a, 0);
/** La franja más angosta: con píxeles de ese orden el reflejo se funde. */
export const STREAK_MIN = Math.min(...GLASS_GLOSS.streaks.map(([a, b]) => b - a));

function rawShade(px: number, py: number, aaT: number): number {
  return mix(GLASS_GLOSS.bottom, GLASS_GLOSS.top, py) * (1 + GLASS_GLOSS.streak * streakAt(diagonal(px, py), aaT));
}

/** El promedio del brillo sobre un paño, de cerca: se divide por él para que el paño conserve su color. */
export const GLOSS_MEAN = (() => {
  const n = 256;
  let sum = 0;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) sum += rawShade((i + 0.5) / n, (j + 0.5) / n, 0);
  return sum / (n * n);
})();

/** Distancia al borde más cercano del rectángulo, o 0 fuera de él. */
const inside = (x: number, y: number, r: Rect) => Math.max(Math.min(x - r[0], r[1] - x, y - r[2], r[3] - y), 0);
const nearOf = (r: Rect, aa: PixelSize) => Math.min(detail(aa[0], r[1] - r[0]), detail(aa[1], r[3] - r[2]));

export function paneGloss(x: number, y: number, pane: Rect, aa: PixelSize): Gloss {
  const d = nearOf(pane, aa);
  if (d <= 0) return { shade: 1, height: 0 };
  const w = pane[1] - pane[0], h = pane[3] - pane[2];
  const px = clamp01((x - pane[0]) / w), py = clamp01((y - pane[2]) / h);
  const aaT = Math.max(aa[0] / w, aa[1] / h) / 1.5;
  const shade = mix(1, rawShade(px, py, aaT) / GLOSS_MEAN, d);
  return { shade, height: -GLASS_GLOSS.insetM * smoothstep(0, GLASS_GLOSS.bevelM, inside(x, y, pane)) * d };
}

export function panelPillow(x: number, y: number, panel: Rect, aa: PixelSize): number {
  const d = nearOf(panel, aa);
  if (d <= 0) return 0;
  return GLASS_GLOSS.pillowM * smoothstep(0, GLASS_GLOSS.bevelM, inside(x, y, panel)) * d;
}

const f = (x: number) => (Number.isInteger(x) ? x.toFixed(1) : String(x));
const [[a0, b0], [a1, b1]] = GLASS_GLOSS.streaks;

/** La misma cuenta en GLSL; un rectángulo es un vec4 (x0, x1, y0, y1). Usa `lookBox` y `lookDetail`. */
export const GLOSS_GLSL = /* glsl */ `
#define LOOK_STREAK ${f(GLASS_GLOSS.streak)}
#define LOOK_STREAK_SHARE ${f(STREAK_SHARE)}
#define LOOK_STREAK_MIN ${f(STREAK_MIN)}
#define LOOK_GLAZED_PERIOD ${f(GLASS_GLOSS.glazedPeriodM)}
float lookStreak(float t, float aaT) {
  float s = aaT + ${f(GLASS_GLOSS.soft)};
  return max(lookBox(t, ${f(a0)}, ${f(b0)}, s), lookBox(t, ${f(a1)}, ${f(b1)}, s));
}
float lookGlossRaw(float px, float py, float aaT) {
  float t = (px - 0.5 * py + 0.5) / 1.5;
  return mix(${f(GLASS_GLOSS.bottom)}, ${f(GLASS_GLOSS.top)}, py) * (1.0 + LOOK_STREAK * lookStreak(t, aaT));
}
float lookInside(vec2 p, vec4 r) { return max(min(min(p.x - r.x, r.y - p.x), min(p.y - r.z, r.w - p.y)), 0.0); }
float lookRectNear(vec4 r, vec2 aa) { return min(lookDetail(aa.x, r.y - r.x), lookDetail(aa.y, r.w - r.z)); }
vec2 lookPaneGloss(vec2 p, vec4 r, vec2 aa) {
  float d = lookRectNear(r, aa);
  if (d <= 0.0) return vec2(1.0, 0.0);
  float w = r.y - r.x, h = r.w - r.z;
  float px = clamp((p.x - r.x) / w, 0.0, 1.0), py = clamp((p.y - r.z) / h, 0.0, 1.0);
  float aaT = max(aa.x / w, aa.y / h) / 1.5;
  float shade = mix(1.0, lookGlossRaw(px, py, aaT) / ${f(GLOSS_MEAN)}, d);
  return vec2(shade, -${f(GLASS_GLOSS.insetM)} * smoothstep(0.0, ${f(GLASS_GLOSS.bevelM)}, lookInside(p, r)) * d);
}
float lookPanelPillow(vec2 p, vec4 r, vec2 aa) {
  float d = lookRectNear(r, aa);
  if (d <= 0.0) return 0.0;
  return ${f(GLASS_GLOSS.pillowM)} * smoothstep(0.0, ${f(GLASS_GLOSS.bevelM)}, lookInside(p, r)) * d;
}
`;
