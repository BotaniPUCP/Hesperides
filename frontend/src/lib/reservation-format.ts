import type { ReservationState } from '@shared/types';

/**
 * Fechas de una reserva (SPEC-107 §2.4): el backend las manda con el desfase de
 * Lima (-05:00), así que la parte literal de la cadena ya es la hora local. No
 * se usa `new Date` para mostrarla: el navegador puede estar en otra zona.
 */

const LIMA_TIME_ZONE = 'America/Lima';

/** Fecha de hoy en Lima, no la del navegador. */
export function todayInLima(): string {
  // en-CA devuelve AAAA-MM-DD, justo lo que espera un <input type="date">.
  return new Intl.DateTimeFormat('en-CA', { timeZone: LIMA_TIME_ZONE }).format(new Date());
}

export function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** El día local en que empieza la reserva. */
export function reservationDay(startsAt: string): string {
  return startsAt.slice(0, 10);
}

/** «2026-11-13T10:00» para un <input type="datetime-local">. */
export function inputFromIso(iso: string): string {
  return iso.slice(0, 16);
}

/** La hora escrita se interpreta como hora de Lima (UTC-5, sin horario de verano). */
export function isoFromInput(local: string): string {
  return `${local.length === 16 ? `${local}:00` : local}-05:00`;
}

export function formatTime(iso: string): string {
  return iso.slice(11, 16);
}

/** «jue 13 nov», o el día completo si se pide. */
export function formatDay(isoDate: string, long = false): string {
  const date = new Date(`${isoDate.slice(0, 10)}T12:00:00Z`);
  return new Intl.DateTimeFormat('es-PE', long
    ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }
    : { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(date);
}

/** Encabezado de la agenda: «Hoy», «Mañana» o «jue 13 nov». */
export function dayHeading(isoDate: string): string {
  const today = todayInLima();
  if (isoDate === today) return 'Hoy';
  if (isoDate === addDays(today, 1)) return 'Mañana';
  const label = formatDay(isoDate);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** «10:00–14:00» en un solo día; «13 nov 10:00 – 15 nov 14:00» si abarca varios. */
export function formatSchedule(startsAt: string, endsAt: string): string {
  const first = reservationDay(startsAt);
  const last = reservationDay(endsAt);
  if (first === last) return `${formatTime(startsAt)}–${formatTime(endsAt)}`;
  return `${formatDay(first)} ${formatTime(startsAt)} – ${formatDay(last)} ${formatTime(endsAt)}`;
}

export function formatDateTime(iso: string): string {
  return `${formatDay(iso, true)}, ${formatTime(iso)}`;
}

const STATE_LABELS: Record<ReservationState, string> = {
  UPCOMING: 'Próxima',
  IN_PROGRESS: 'En curso',
  FINISHED: 'Terminada',
  CANCELLED: 'Anulada',
};

const STATE_COLORS: Record<ReservationState, 'info' | 'success' | 'neutral'> = {
  UPCOMING: 'info',
  IN_PROGRESS: 'success',
  FINISHED: 'neutral',
  CANCELLED: 'neutral',
};

export function stateLabel(state: ReservationState): string {
  return STATE_LABELS[state];
}

export function stateColor(state: ReservationState): 'info' | 'success' | 'neutral' {
  return STATE_COLORS[state];
}

/** Una reserva se puede editar o anular mientras no terminó ni se anuló (D-09). */
export function isEditable(state: ReservationState): boolean {
  return state === 'UPCOMING' || state === 'IN_PROGRESS';
}
