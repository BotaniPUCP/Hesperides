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
  const fecha = `${enLima.getUTCFullYear()}-${dosDigitos(enLima.getUTCMonth() + 1)}-${dosDigitos(enLima.getUTCDate())}`;
  return `${fecha}T12:00:00-05:00`;
}
