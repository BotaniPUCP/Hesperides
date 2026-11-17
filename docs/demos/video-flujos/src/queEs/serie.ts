// Las escenas como una TransitionSeries de @remotion/transitions, sin mover la voz: cada escena
// entra durante el hueco que construirLinea deja antes de su primera frase.
import type { EscenaId } from '../guion';
import type { Linea } from '../tiempos';

export type TramoSerie = { id: EscenaId; desde: number; duracion: number };

export function tramosDeSerie(linea: Linea, total: number, transicion: number): TramoSerie[] {
  const desdes = linea.escenas.map((e, i) => (i === 0 ? 0 : e.desde - transicion));
  return linea.escenas.map((e, i) => {
    const hasta = i === linea.escenas.length - 1 ? total : desdes[i + 1] + transicion;
    return { id: e.id, desde: desdes[i], duracion: hasta - desdes[i] };
  });
}

/**
 * Cómo se pasa de una escena a otra. Nunca deslizando de lado a lado: fundido, cortina que
 * descubre la pantalla (wipe) o iris. `destello`: luz cálida encima del corte.
 */
export type Corte = { tipo: 'fundido' | 'cortina' | 'iris'; destello: boolean };

export const CORTES: Partial<Record<`${EscenaId}>${EscenaId}`, Corte>> = {
  // Del vuelo al atardecer a la oficina de Lucía.
  'queEs>lucia': { tipo: 'fundido', destello: true },
  // Del campus ilustrado a la pantalla del celular.
  'campus>tuberia': { tipo: 'cortina', destello: false },
  'tuberia>bandeja': { tipo: 'cortina', destello: false },
  'actividad>calendario': { tipo: 'cortina', destello: false },
  // El momento clave: el globo.
  'cuadrilla>globo': { tipo: 'iris', destello: true },
  'observacion>historial': { tipo: 'cortina', destello: false },
  'historial>cierra': { tipo: 'cortina', destello: false },
  // El cierre con el logo.
  'juntos>logo': { tipo: 'fundido', destello: true },
};

export function corteEntre(de: EscenaId, a: EscenaId): Corte {
  return CORTES[`${de}>${a}`] ?? { tipo: 'fundido', destello: false };
}
