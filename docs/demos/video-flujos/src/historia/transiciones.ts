// Cortes entre escenas con @remotion/transitions. La transición ocupa el respiro silencioso que ya
// había antes de cada escena (FRAMES_TRANSICION), así la voz y los golpes no se corren.
import type { Linea, TramoEscena } from '../tiempos';

export type TipoCorte = 'fade' | 'wipe' | 'iris';
/** Cómo se pasa a la escena siguiente; `luz` suma un destello cálido (light leak) sobre el corte. */
export type Corte = { tipo: TipoCorte; luz: boolean };

/** Uno por cambio de escena: mañana→hoy, hoy→aparece, aparece→solución, solución→resultado. */
export const CORTES_HISTORIA: Corte[] = [
  { tipo: 'fade', luz: false },
  // Llega Hespo: se abre como una ventana de luz.
  { tipo: 'iris', luz: true },
  { tipo: 'wipe', luz: false },
  { tipo: 'fade', luz: true },
];

export type SecuenciaEscena = { escena: TramoEscena; desde: number; duracion: number };

/**
 * Inicio absoluto y duración de cada escena dentro de una TransitionSeries con transiciones de
 * `t` cuadros: la escena i+1 empieza `t` cuadros antes de su `desde`, encima del final de la i.
 */
export function secuenciasConTransicion(linea: Linea, total: number, t: number): SecuenciaEscena[] {
  return linea.escenas.map((escena, i) => {
    const desde = i === 0 ? 0 : escena.desde - t;
    const siguiente = linea.escenas[i + 1];
    const hasta = siguiente ? siguiente.desde : total;
    return { escena, desde, duracion: hasta - desde };
  });
}
