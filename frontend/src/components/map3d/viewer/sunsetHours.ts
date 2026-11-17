/**
 * Las horas del modo Atardecer, sin three: las usa también la barra del mapa, que
 * no debe cargar la maqueta para mostrar el deslizador.
 */

/** La hora con que se prende el modo: el sol a unos 2° sobre el horizonte, por el oeste. */
export const SUNSET_HOUR = 17.85;

/** El deslizador «Hora» del modo: de la hora dorada al crepúsculo. */
export const SUNSET_HOURS = [16.5, 18.6] as const;

/** «17:43» para 17,72. */
export function clockOf(hour: number): string {
  const total = Math.round(hour * 60);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
