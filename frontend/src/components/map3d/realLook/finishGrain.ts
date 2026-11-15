import { BRICK, CONCRETE, finishId, GRAIN_SEED, METAL, PLASTER } from './finishes';
import { box, cellHash, detail, glslMod, mix, smoothstep } from './lookMath';
import type { PixelSize } from './facadeColor';

/**
 * El grano de un acabado en un punto de la cara (SPEC-112 D-17): cuánto
 * aclara u oscurece el color de la ficha (`shade`, de promedio 1 sobre la cara)
 * y la altura del relieve en metros (`height`, 0 en la cara de cada pieza).
 * De lejos los dos se funden: `shade` = 1 y `height` = 0. `lookFinishShader.ts`
 * hace la misma cuenta en GLSL.
 */

export interface Grain { shade: number; height: number }

const NONE: Grain = { shade: 1, height: 0 };
const BRICK_ID = finishId('brick'), CONCRETE_ID = finishId('concrete'), METAL_ID = finishId('metal'), PLASTER_ID = finishId('plaster');

interface Tiling { w: number; h: number; joint: number; vary: number; jointShade: number; relief: number }

/** Piezas de w × h con juntas: cuánto del píxel es pieza en cada eje, fundido en la proporción de pieza de lejos. */
function pieceCover(x: number, y: number, t: Tiling, aa: PixelSize): [number, number] {
  const half = t.joint / 2;
  const inX = mix(1 - t.joint / t.w, box(glslMod(x, t.w), half, t.w - half, aa[0]), detail(aa[0], t.w));
  const inY = mix(1 - t.joint / t.h, box(glslMod(y, t.h), half, t.h - half, aa[1]), detail(aa[1], t.h));
  return [inX, inY];
}

/** Ladrillo o concreto: piezas con su tono, juntas más oscuras y hundidas. `shift` corre las hiladas impares (a soga). */
function tiled(t: Tiling, u: number, v: number, aa: PixelSize, seed: number, shift: number): Grain {
  const row = Math.floor(v / t.h);
  const x = u + glslMod(row, 2) * shift;
  const [inX, inY] = pieceCover(x, v, t, aa);
  const piece = inX * inY;
  const near = Math.min(detail(aa[0], t.w), detail(aa[1], t.h));
  const tone = 1 + t.vary * (2 * cellHash(Math.floor(x / t.w), row, seed + GRAIN_SEED)[1] - 1) * detail(aa[0], t.w);
  const fill = (1 - t.joint / t.w) * (1 - t.joint / t.h);
  const shade = mix(t.jointShade, tone, piece) / mix(t.jointShade, 1, fill);
  return { shade, height: (piece - 1) * t.relief * near };
}

const BRICK_TILING: Tiling = { w: BRICK.lengthM, h: BRICK.courseM, joint: BRICK.jointM, vary: BRICK.vary, jointShade: BRICK.mortar, relief: BRICK.reliefM };
const CONCRETE_TILING: Tiling = {
  w: CONCRETE.widthM, h: CONCRETE.heightM, joint: CONCRETE.jointM, vary: CONCRETE.vary, jointShade: CONCRETE.joint, relief: CONCRETE.reliefM,
};

/** Engrapes verticales: una franja clara y en relieve cada tanto. */
function seams(u: number, aa: PixelSize): Grain {
  const half = METAL.seamM / 2, d = detail(aa[0], METAL.seamEveryM);
  const seam = mix(METAL.seamM / METAL.seamEveryM, 1 - box(glslMod(u, METAL.seamEveryM), half, METAL.seamEveryM - half, aa[0]), d);
  const mean = mix(1, METAL.seam, METAL.seamM / METAL.seamEveryM);
  return { shade: mix(1, METAL.seam, seam) / mean, height: seam * METAL.reliefM * d };
}

/** Manchas suaves: ruido de valor sobre una retícula de celdas, interpolado sin bordes. */
function mottle(u: number, v: number, aa: PixelSize, seed: number): Grain {
  const gx = u / PLASTER.cellM, gy = v / PLASTER.cellM;
  const ix = Math.floor(gx), iy = Math.floor(gy);
  const sx = smoothstep(0, 1, gx - ix), sy = smoothstep(0, 1, gy - iy);
  const h = (i: number, j: number) => cellHash(ix + i, iy + j, seed + GRAIN_SEED)[1];
  const n = mix(mix(h(0, 0), h(1, 0), sx), mix(h(0, 1), h(1, 1), sx), sy);
  const d = Math.min(detail(aa[0], PLASTER.cellM), detail(aa[1], PLASTER.cellM));
  return { shade: 1 + PLASTER.vary * (2 * n - 1) * d, height: 0 };
}

/** Un techo (semilla negativa) no lleva grano: sus coordenadas no son las de una fachada. */
export function finishGrain(finish: number, u: number, v: number, aa: PixelSize, seed: number): Grain {
  if (seed < 0) return NONE;
  if (finish === BRICK_ID) return tiled(BRICK_TILING, u, v, aa, seed, BRICK.lengthM / 2);
  if (finish === CONCRETE_ID) return tiled(CONCRETE_TILING, u, v, aa, seed, 0);
  if (finish === METAL_ID) return seams(u, aa);
  if (finish === PLASTER_ID) return mottle(u, v, aa, seed);
  return NONE;
}
