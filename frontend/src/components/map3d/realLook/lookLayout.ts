/**
 * Lo que comparten la tabla de fichas, el shader que la lee y su copia en
 * TypeScript (`facadeColor`). El GLSL recibe estas constantes por `LAYOUT_GLSL`:
 * un solo lugar, para que no se separen.
 *
 * La tabla es una lista de texeles RGBA. Un material ocupa MATERIAL_TEXELS:
 * color y tipo · perfil y su grosor · antepecho y su alto · acento y su
 * proporción · módulo, alto, variación de tono. Una región ocupa REGION_TEXELS:
 * u0, u1, v0, v1 · material, alto de piso, centro y medio alto de la franja.
 * Una cara ocupa un texel: muro, primera región, cuántas, semilla.
 */

/** Regiones que puede pintar una cara, contando las comunes (SPEC-112 D-03 y D-14). */
export const MAX_REGIONS = 12;
/** Texeles por fila de la textura. */
export const TABLE_WIDTH = 256;
export const MATERIAL_TEXELS = 5;
export const REGION_TEXELS = 2;
export const KIND_SOLID = 0;
export const KIND_GLASS = 1;
/** Un tramo sin límite: lejos de cualquier edificio del campus, pero finito para el shader. */
export const NO_BOUND_M = 1e5;
/** Grosor de los perfiles cuando la ficha no lo dice. */
export const DEFAULT_FRAME_M = 0.06;
/** Una región que cubre menos que esto no se pinta. */
export const MIN_COVERAGE = 0.001;
/** Con esta cobertura acumulada, lo de abajo ya no se ve. */
export const OPAQUE = 0.995;
/** Entre estas razones píxel / período, perfiles y franjas se funden en su promedio (D-08). */
export const DETAIL_FADE = [0.2, 0.5] as const;
/**
 * El hash de cada módulo (acento y tono) es de enteros (pcg2d, Jarzynski y Olano 2020): da lo mismo en la
 * GPU que en TypeScript. Uno de floats se separa en las cifras grandes y la hoja no mostraría los mismos paneles.
 */
export const PCG_MUL = 1664525;
export const PCG_ADD = 1013904223;
/** Mezclan la semilla de la cara en cada eje, para que dos caras no repartan igual sus acentos. */
export const SEED_MIX = [0x9e3779b9, 0x85ebca6b] as const;

const f = (x: number) => (Number.isInteger(x) ? x.toFixed(1) : String(x));

export const LAYOUT_GLSL = /* glsl */ `
#define LOOK_TABLE_WIDTH ${f(TABLE_WIDTH)}
#define LOOK_MAX_REGIONS ${MAX_REGIONS}
#define LOOK_REGION_TEXELS ${f(REGION_TEXELS)}
#define LOOK_NO_BOUND ${f(NO_BOUND_M)}
#define LOOK_MIN_COVERAGE ${f(MIN_COVERAGE)}
#define LOOK_OPAQUE ${f(OPAQUE)}
#define LOOK_FADE_FROM ${f(DETAIL_FADE[0])}
#define LOOK_FADE_TO ${f(DETAIL_FADE[1])}
#define LOOK_PCG_MUL ${PCG_MUL}u
#define LOOK_PCG_ADD ${PCG_ADD}u
#define LOOK_SEED_MIX_X ${SEED_MIX[0]}u
#define LOOK_SEED_MIX_Y ${SEED_MIX[1]}u
`;
