export type Boca = 'cerrada' | 'media' | 'abierta';

const BANDAS_DE_VOZ = 8;
const GANANCIA = 7;

export function formaDeBoca(apertura: number): Boca {
  if (apertura < 0.15) return 'cerrada';
  return apertura < 0.55 ? 'media' : 'abierta';
}

/** Promedia las frecuencias de la voz: bastan para saber si está hablando y cuánto. */
export function aperturaDesdeEspectro(muestras: number[]): number {
  const voz = muestras.slice(0, BANDAS_DE_VOZ);
  if (voz.length === 0) return 0;
  const promedio = voz.reduce((suma, m) => suma + m, 0) / voz.length;
  return Math.min(1, promedio * GANANCIA);
}
