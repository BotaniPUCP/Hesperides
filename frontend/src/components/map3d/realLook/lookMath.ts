import { DETAIL_FADE, PCG_ADD, PCG_MUL, SEED_MIX } from './lookLayout';

/**
 * Las funciones de GLSL que usa la copia en TypeScript de las fachadas
 * (`facadeColor`, `finishGrain`), con la misma semántica que en el shader.
 */

export const clamp01 = (x: number) => Math.min(Math.max(x, 0), 1);
export const smoothstep = (a: number, b: number, x: number) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export const glslMod = (x: number, y: number) => x - y * Math.floor(x / y);
/** 1 dentro de [a, b], con bordes suavizados en `aa`: aproxima cuánto del píxel cae dentro. */
export const box = (x: number, a: number, b: number, aa: number) => clamp01(smoothstep(a - aa, a + aa, x) - smoothstep(b - aa, b + aa, x));
/** 1 cerca; 0 cuando el píxel ya es una buena parte del período y conviene el promedio. */
export const detail = (pixel: number, period: number) => 1 - smoothstep(DETAIL_FADE[0], DETAIL_FADE[1], pixel / period);

const TWO_32 = 4294967296;

/** pcg2d de la celda (cx, cy) con la semilla de la cara: dos números en [0, 1). */
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
