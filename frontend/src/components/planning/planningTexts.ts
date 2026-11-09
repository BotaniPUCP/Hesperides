/**
 * Textos de la planificación preventiva (SPEC-203 §7). En pantalla nunca se dice
 * «ronda», «ritmo», «alcance» ni «scope».
 */

/** «1 jardín», «18 jardines». */
export function gardensLabel(count: number): string {
  return count === 1 ? '1 jardín' : `${count} jardines`;
}
