import type { CampusEventOccurrence } from '@shared/types';

/**
 * Lo que la agenda y el formulario del calendario calculan sin React (SPEC-114 §5.1-5.2).
 * Los meses viajan como «2026-11» y las fechas como «2026-11-05», sin zona horaria: son días
 * civiles de Lima.
 */

const WEEKDAY_PLURAL = ['', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados', 'domingos'];
const WEEKDAY_SINGULAR = ['', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const SHORT_MONTH = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const LONG_MONTH = new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric', timeZone: 'UTC' });

const utc = (isoDate: string) => new Date(`${isoDate}T12:00:00Z`);
const iso = (date: Date) => date.toISOString().slice(0, 10);

export function monthRange(month: string): { from: string; to: string } {
  const [year, m] = month.split('-').map(Number);
  const last = new Date(Date.UTC(year, m, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, '0')}` };
}

export function shiftMonth(month: string, delta: number): string {
  const [year, m] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, m - 1 + delta, 1));
  return iso(date).slice(0, 7);
}

/** «Noviembre de 2026». */
export function monthLabel(month: string): string {
  const text = LONG_MONTH.format(utc(`${month}-01`));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** «5 nov», sin el punto de la abreviatura. */
export function shortDay(isoDate: string): string {
  return SHORT_MONTH.format(utc(isoDate)).replace('.', '');
}

export function groupByDay(items: readonly CampusEventOccurrence[]): [string, CampusEventOccurrence[]][] {
  const groups = new Map<string, CampusEventOccurrence[]>();
  for (const item of items) {
    const group = groups.get(item.date);
    if (group) group.push(item);
    else groups.set(item.date, [item]);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}

export function eventHours(o: { startTime: string | null; endTime: string | null }): string {
  return o.startTime && o.endTime ? `${o.startTime}–${o.endTime}` : 'Todo el día';
}

export interface RuleDraft {
  startDate: string;
  endDate: string;
  weekdays: number[];
  startTime: string | null;
  endTime: string | null;
}

/** Los días en que ocurre, igual que EventOccurrences del backend (ISO: 1 = lunes). */
export function occurrenceDates({ startDate, endDate, weekdays }: RuleDraft): string[] {
  const dates: string[] = [];
  if (!startDate || !endDate || endDate < startDate) return dates;
  for (let d = utc(startDate); iso(d) <= endDate; d.setUTCDate(d.getUTCDate() + 1)) {
    const isoDay = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
    if (weekdays.length === 0 || weekdays.includes(isoDay)) dates.push(iso(d));
  }
  return dates;
}

/** «16 jueves, del 18 mar al 1 jul, de 14:00 a 18:00». */
export function summarize(rule: RuleDraft): string {
  const dates = occurrenceDates(rule);
  if (dates.length === 0) return 'Con esos días de la semana no ocurre ningún día entre esas fechas';
  const what = rule.weekdays.length === 1
    ? `${dates.length} ${dates.length === 1 ? WEEKDAY_SINGULAR[rule.weekdays[0]] : WEEKDAY_PLURAL[rule.weekdays[0]]}`
    : `${dates.length} ${dates.length === 1 ? 'día' : 'días'}`;
  const span = dates.length === 1 ? `el ${shortDay(dates[0])}`
    : `del ${shortDay(dates[0])} al ${shortDay(dates[dates.length - 1])}`;
  const hours = rule.startTime && rule.endTime ? `de ${rule.startTime} a ${rule.endTime}` : 'todo el día';
  return `${what}, ${span}, ${hours}`;
}
