import { FINISHES, type Finish, type SolidMaterial } from './types';

/**
 * Los acabados de los materiales lisos (SPEC-112 D-17 y D-18): de qué nombre
 * sale cada uno, su rugosidad y su metal, y las medidas de su grano. El GLSL
 * recibe las medidas por `FINISH_GLSL`, para que no se separen de `finishGrain`.
 */

/** El primero que calza con el comienzo del nombre gana; sin ninguno, tarrajeo pintado. */
const BY_NAME: [RegExp, Finish][] = [
  [/^ladrillo/, 'brick'],
  [/^(concreto|losa|zocalo|testero|base|bloque)/, 'concrete'],
  [/^(metal|oxido|remate)/, 'metal'],
  [/^(ventana|vidrio|vano|translucido|vitr|cinta)/, 'glazed'],
  [/^(techo|sombra)/, 'smooth'],
];
const DEFAULT_FINISH: Finish = 'plaster';

const plain = (name: string) => name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function finishOf(name: string, m: SolidMaterial): Finish {
  if (m.finish) return m.finish;
  const key = plain(name);
  return BY_NAME.find(([re]) => re.test(key))?.[1] ?? DEFAULT_FINISH;
}

/** El número con que la tabla y el shader nombran un acabado. */
export const finishId = (f: Finish) => FINISHES.indexOf(f);

export interface FinishLight { rough: number; metal: number }

export const FINISH_LIGHT: Record<Finish, FinishLight> = {
  smooth: { rough: 0.88, metal: 0 },
  plaster: { rough: 0.9, metal: 0 },
  brick: { rough: 0.92, metal: 0 },
  concrete: { rough: 0.86, metal: 0 },
  metal: { rough: 0.45, metal: 0.3 },
  glazed: { rough: 0.3, metal: 0.05 },
};

/** Paños del vidrio y sus perfiles (D-19). */
export const GLASS_LIGHT = { pane: { rough: 0.18, metal: 0.1 }, frame: { rough: 0.6, metal: 0.2 } } as const;
/**
 * De noche (D-19): qué parte de los paños se enciende, el desfase de su hash respecto del de los acentos, su luz
 * y su intensidad. Cada paño encendido tiene su nivel, de `dim` a 1, para que no se lean como calcomanías.
 */
export const GLASS_NIGHT = { share: 0.3, seed: 211, color: '#ffd9a0', glow: 0.5, dim: 0.6 } as const;
/** El nivel promedio de un paño encendido. */
export const LIT_MEAN = (1 + GLASS_NIGHT.dim) / 2;
/**
 * Brillo y relieve de las ventanas (D-23): degradado de abajo a arriba, dos franjas en diagonal (tramos de la
 * coordenada diagonal t, de 0 a 1), cuánto aclaran y lo suave de su borde; el hundido, el bisel y el abombado
 * en metros; y cada cuánto se repite el reflejo en una cinta acristalada lisa, que no tiene paños.
 */
export const GLASS_GLOSS = {
  bottom: 0.94, top: 1.06, streaks: [[0.36, 0.48], [0.56, 0.62]], streak: 0.35, soft: 0.04,
  insetM: 0.06, bevelM: 0.12, pillowM: 0.05, glazedPeriodM: 1.6,
} as const;

/** Medidas en metros del grano de cada acabado (D-17). `vary` es el cambio de tono de una pieza a otra. */
export const BRICK = { courseM: 0.075, lengthM: 0.25, jointM: 0.012, vary: 0.08, mortar: 0.82, reliefM: 0.02, patchM: 1.4, patchVary: 0.08 } as const;
export const CONCRETE = { widthM: 2.4, heightM: 1.2, jointM: 0.015, vary: 0.04, joint: 0.78, reliefM: 0.012, patchM: 2.4, patchVary: 0.06 } as const;
export const METAL = { seamEveryM: 0.6, seamM: 0.04, seam: 1.08, reliefM: 0.015 } as const;
export const PLASTER = { cellM: 1.6, vary: 0.035 } as const;
/** Desfasa el hash del grano del de los acentos y del de las ventanas encendidas. */
export const GRAIN_SEED = 101;
/** Desfasa el hash de los parches (variación de lejos) del de las piezas. */
export const PATCH_SEED = 31;
/**
 * Suciedad bajo las ventanas: una banda más oscura que baja desde el borde inferior del paño sobre el
 * antepecho, `heightM` de alto, oscureciendo hasta `share` arriba y nada abajo.
 */
export const GRIME = { heightM: 0.6, share: 0.22 } as const;

const f = (x: number) => (Number.isInteger(x) ? x.toFixed(1) : String(x));
const ids = FINISHES.map((name) => `#define LOOK_FINISH_${name.toUpperCase()} ${f(finishId(name))}`).join('\n');
const light = (key: string, l: FinishLight) => `#define LOOK_${key}_ROUGH ${f(l.rough)}\n#define LOOK_${key}_METAL ${f(l.metal)}`;

export const FINISH_GLSL = /* glsl */ `
${ids}
${light('PANE', GLASS_LIGHT.pane)}
${light('FRAME', GLASS_LIGHT.frame)}
#define LOOK_BRICK vec4(${f(BRICK.courseM)}, ${f(BRICK.lengthM)}, ${f(BRICK.jointM)}, ${f(BRICK.vary)})
#define LOOK_BRICK_MORTAR ${f(BRICK.mortar)}
#define LOOK_BRICK_RELIEF ${f(BRICK.reliefM)}
#define LOOK_CONCRETE vec4(${f(CONCRETE.widthM)}, ${f(CONCRETE.heightM)}, ${f(CONCRETE.jointM)}, ${f(CONCRETE.vary)})
#define LOOK_CONCRETE_JOINT ${f(CONCRETE.joint)}
#define LOOK_CONCRETE_RELIEF ${f(CONCRETE.reliefM)}
#define LOOK_METAL vec4(${f(METAL.seamEveryM)}, ${f(METAL.seamM)}, ${f(METAL.seam)}, ${f(METAL.reliefM)})
#define LOOK_PLASTER vec2(${f(PLASTER.cellM)}, ${f(PLASTER.vary)})
#define LOOK_BRICK_PATCH vec2(${f(BRICK.patchM)}, ${f(BRICK.patchVary)})
#define LOOK_CONCRETE_PATCH vec2(${f(CONCRETE.patchM)}, ${f(CONCRETE.patchVary)})
#define LOOK_PATCH_SEED ${f(PATCH_SEED)}
#define LOOK_GRIME vec2(${f(GRIME.heightM)}, ${f(GRIME.share)})
#define LOOK_GRAIN_SEED ${f(GRAIN_SEED)}
#define LOOK_LIT_SHARE ${f(GLASS_NIGHT.share)}
#define LOOK_LIT_SEED ${f(GLASS_NIGHT.seed)}
#define LOOK_LIT_DIM ${f(GLASS_NIGHT.dim)}
#define LOOK_LIT_MEAN ${f(LIT_MEAN)}
`;
