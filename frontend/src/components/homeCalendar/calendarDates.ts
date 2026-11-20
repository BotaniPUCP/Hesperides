import { addDays } from '@/lib/reservation-format';
import { monthLabel, shiftMonth } from '@/components/campusEvents/campusEventFormat';

/**
 * Las fechas del calendario del inicio (SPEC-121), sin React. Las fechas son días
 * civiles de Lima en «2026-11-19»; la semana empieza el lunes, como en el resto del
 * sistema.
 */

export type CalendarView = 'day' | 'week' | 'month';

const DAYS_IN_WEEK = 7;
const MONTH_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const LONG_DAY = new Intl.DateTimeFormat('es-PE', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
});

const utc = (isoDate: string) => new Date(`${isoDate}T12:00:00Z`);
/** 0 = lunes … 6 = domingo. */
const weekdayIndex = (isoDate: string) => (utc(isoDate).getUTCDay() + 6) % DAYS_IN_WEEK;
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export function weekOf(isoDate: string): string[] {
  const monday = addDays(isoDate, -weekdayIndex(isoDate));
  return Array.from({ length: DAYS_IN_WEEK }, (_, i) => addDays(monday, i));
}

/** Las semanas completas que cubren el mes, de lunes a domingo. */
export function monthGrid(month: string): string[][] {
  const weeks: string[][] = [];
  let monday = weekOf(`${month}-01`)[0];
  while (weeks.length === 0 || monday.slice(0, 7) === month) {
    weeks.push(weekOf(monday));
    monday = addDays(monday, DAYS_IN_WEEK);
  }
  return weeks;
}

/** Lo que se pide al backend: los días visibles. Un mes son 42 días como mucho (el backend admite 62). */
export function rangeOf(view: CalendarView, anchor: string): { from: string; to: string } {
  if (view === 'day') return { from: anchor, to: anchor };
  if (view === 'week') {
    const week = weekOf(anchor);
    return { from: week[0], to: week[DAYS_IN_WEEK - 1] };
  }
  const grid = monthGrid(anchor.slice(0, 7));
  return { from: grid[0][0], to: grid[grid.length - 1][DAYS_IN_WEEK - 1] };
}

/** Las flechas: un día, una semana o un mes (al día 1 del mes nuevo). */
export function shiftAnchor(view: CalendarView, anchor: string, delta: number): string {
  if (view === 'day') return addDays(anchor, delta);
  if (view === 'week') return addDays(anchor, delta * DAYS_IN_WEEK);
  return `${shiftMonth(anchor.slice(0, 7), delta)}-01`;
}

function shortDate(isoDate: string, withYear: boolean): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return `${day} ${MONTH_SHORT[month - 1]}${withYear ? ` ${year}` : ''}`;
}

function weekTitle(anchor: string): string {
  const week = weekOf(anchor);
  const [first, last] = [week[0], week[DAYS_IN_WEEK - 1]];
  const lastText = shortDate(last, true);
  if (first.slice(0, 4) !== last.slice(0, 4)) return `${shortDate(first, true)} – ${lastText}`;
  if (first.slice(0, 7) !== last.slice(0, 7)) return `${shortDate(first, false)} – ${lastText}`;
  return `${Number(first.slice(8))} – ${lastText}`;
}

export function titleOf(view: CalendarView, anchor: string): string {
  if (view === 'month') return monthLabel(anchor.slice(0, 7));
  if (view === 'week') return weekTitle(anchor);
  return capitalize(LONG_DAY.format(utc(anchor)));
}
