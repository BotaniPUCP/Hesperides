import { Easing, interpolate } from 'remotion';
import type { TramoEscena } from '../tiempos';

const FRAMES_APARICION = 12;
export const FRAMES_PULSO = 18;

/**
 * Progreso de 0 a 1 de algo que aparece con una frase. `retraso` es la fracción
 * de la frase que espera: ancla un elemento sin escribir segundos a mano.
 */
export function apareceEn(escena: TramoEscena, fraseId: string, frame: number, retraso = 0): number {
  const tramo = escena.frases.find((f) => f.frase.id === fraseId);
  if (!tramo) throw new Error(`La frase ${fraseId} no está en la escena ${escena.id}`);
  const inicio = tramo.desde + retraso * tramo.frames;
  return interpolate(frame, [inicio, inicio + FRAMES_APARICION], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
}

/** Igual que apareceEn, pero a partir de un fotograma, como el aterrizaje de Hespo. */
export function apareceDesde(frame: number, inicio: number): number {
  return interpolate(frame, [inicio, inicio + FRAMES_APARICION], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
}

/** Avance lineal de 0 a 1 entre dos fracciones de una frase, para lo que debe durar parejo. */
export function progresoEntre(escena: TramoEscena, fraseId: string, frame: number, desde: number, hasta: number): number {
  const tramo = escena.frases.find((f) => f.frase.id === fraseId);
  if (!tramo) throw new Error(`La frase ${fraseId} no está en la escena ${escena.id}`);
  return interpolate(frame, [tramo.desde + desde * tramo.frames, tramo.desde + hasta * tramo.frames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

/** Avance de la onda que nace cuando Hespo aterriza sobre algo. */
export function pulsoDesde(frame: number, inicio: number): number {
  return interpolate(frame, [inicio, inicio + FRAMES_PULSO], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
}

/** El fotograma de una fracción de la frase. */
export function momentoDe(escena: TramoEscena, fraseId: string, fraccion = 0): number {
  const tramo = escena.frases.find((f) => f.frase.id === fraseId);
  if (!tramo) throw new Error(`La frase ${fraseId} no está en la escena ${escena.id}`);
  return tramo.desde + Math.round(fraccion * tramo.frames);
}

/** Qué pantalla real se ve: la última de la agenda cuyo fotograma ya llegó. */
export function capturaEn(agenda: [number, string][], frame: number): string {
  let actual = agenda[0][1];
  let anterior = agenda[0][0];
  for (const [inicio, captura] of agenda) {
    if (inicio < anterior) throw new Error(`La agenda no va en orden: ${captura}`);
    anterior = inicio;
    if (frame >= inicio) actual = captura;
  }
  return actual;
}

/** Lo que va apareciendo de un texto mientras se escribe. */
export function escrito(texto: string, progreso: number): string {
  return texto.slice(0, Math.floor(texto.length * progreso));
}

/** La última frase iniciada, también durante la pausa siguiente; -1 si aún no empieza ninguna. */
export function indiceFrase(escena: TramoEscena, frame: number): number {
  let indice = -1;
  escena.frases.forEach((tramo, i) => {
    if (frame >= tramo.desde) indice = i;
  });
  return indice;
}
