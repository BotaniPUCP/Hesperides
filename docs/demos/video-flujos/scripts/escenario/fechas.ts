/** Fechas del escenario de demostración, en el día civil de Lima (UTC−5, sin horario de verano). */

const DESFASE_LIMA_MS = -5 * 60 * 60 * 1000;
const DIA_MS = 24 * 60 * 60 * 1000;

const dosDigitos = (n: number) => String(n).padStart(2, '0');

/**
 * Las 12:00 de Lima de hace `dias` días. Al mediodía, la fecha es la misma en Lima y en UTC,
 * así que una columna con o sin zona horaria cae en el mismo día.
 */
export function mediodiaLimaHace(dias: number, ahora: Date): string {
  const enLima = new Date(ahora.getTime() + DESFASE_LIMA_MS - dias * DIA_MS);
  return `${fechaDe(enLima)}T12:00:00-05:00`;
}

const fechaDe = (enLima: Date) => `${enLima.getUTCFullYear()}-${dosDigitos(enLima.getUTCMonth() + 1)}-${dosDigitos(enLima.getUTCDate())}`;

/**
 * Horas de las reservas de hoy, contadas desde la hora en punto actual de Lima: la que está en
 * curso va de −1 h a +2 h y la terminada de −4 h a −3 h.
 */
const RESERVA_TERMINADA_DESDE_H = -4;
const RESERVA_EN_CURSO_HASTA_H = 2;

/** La hora en punto de hoy en Lima que queda `desplazamiento` horas después de la hora actual. */
export function horaLimaHoy(desplazamiento: number, ahora: Date): string {
  const enLima = new Date(ahora.getTime() + DESFASE_LIMA_MS);
  const hora = enLima.getUTCHours() + desplazamiento;
  return `${fechaDe(enLima)}T${dosDigitos(hora)}:00:00-05:00`;
}

/** Si la reserva en curso y la terminada caben dentro del día de hoy en Lima. */
export function cabenReservasDeHoy(ahora: Date): boolean {
  const hora = new Date(ahora.getTime() + DESFASE_LIMA_MS).getUTCHours();
  return hora + RESERVA_TERMINADA_DESDE_H >= 0 && hora + RESERVA_EN_CURSO_HASTA_H <= 23;
}

export const HORAS_RESERVAS_DE_HOY = {
  enCurso: { desde: -1, hasta: RESERVA_EN_CURSO_HASTA_H },
  terminada: { desde: RESERVA_TERMINADA_DESDE_H, hasta: -3 },
} as const;
