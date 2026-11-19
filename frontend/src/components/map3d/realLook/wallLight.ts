import { mix, smoothstep } from './lookMath';

/**
 * La luz que el muro recupera del modo rosado (SPEC-112 D-16) y su contacto con
 * el suelo (D-20). `tone` es el tono por vértice de `geometry.ts → shading`:
 * los muros van de 0,58 al pie a 0,86 arriba, y los techos desde 1,12. `liftM`
 * es la altura sobre el vértice más bajo del edificio. `lookLightShader.ts`
 * hace la misma cuenta en GLSL.
 */

export const WALL_LIGHT = {
  /** Tono medio del muro: ahí el volumen no aclara ni oscurece. */
  toneMid: 0.72,
  /** Qué parte del degradado del rosado vuelve. */
  volume: 0.4,
  /** Desde este tono la cara es un techo. */
  roofTone: 1,
  contactM: 0.9,
  contact: 0.14,
} as const;

export function wallLight(tone: number, liftM: number): number {
  if (tone >= WALL_LIGHT.roofTone) return 1;
  const volume = mix(1, tone / WALL_LIGHT.toneMid, WALL_LIGHT.volume);
  const contact = 1 - WALL_LIGHT.contact * (1 - smoothstep(0, WALL_LIGHT.contactM, liftM));
  return volume * contact;
}

const f = (x: number) => (Number.isInteger(x) ? x.toFixed(1) : String(x));

export const WALL_LIGHT_GLSL = /* glsl */ `
float lookWallLight(float tone, float lift) {
  if (tone >= ${f(WALL_LIGHT.roofTone)}) return 1.0;
  float volume = mix(1.0, tone / ${f(WALL_LIGHT.toneMid)}, ${f(WALL_LIGHT.volume)});
  return volume * (1.0 - ${f(WALL_LIGHT.contact)} * (1.0 - smoothstep(0.0, ${f(WALL_LIGHT.contactM)}, lift)));
}
`;
