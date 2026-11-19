import type { CalendarEntryKind } from './calendarEntries';

/**
 * El color de cada clase de evento. El bloqueante usa el morado de su globo en el
 * mapa y el feriado va neutro, como en la agenda del calendario (SPEC-114 §7); la
 * reserva, el azul de «en curso».
 */
export const ENTRY_CLASS: Record<CalendarEntryKind, string> = {
  BLOCKING: 'bg-[#F3E5F5] text-[#6A1B9A] border-[#6A1B9A] dark:bg-[#4A148C]/40 dark:text-[#E1BEE7] dark:border-[#CE93D8]',
  HOLIDAY: 'bg-neutral-100 text-neutral-700 border-neutral-400',
  RESERVATION: 'bg-status-in-progress-bg text-info-600 border-info-600',
};

/** El punto de color de la vista de mes. */
export const ENTRY_DOT: Record<CalendarEntryKind, string> = {
  BLOCKING: 'bg-[#6A1B9A] dark:bg-[#CE93D8]',
  HOLIDAY: 'bg-neutral-400',
  RESERVATION: 'bg-info-600',
};

/** «09:00» para 540 minutos; la medianoche del final del día es «24:00». */
export function clock(minutes: number): string {
  const hours = Math.floor(minutes / 60), rest = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}
