import type { CampusEventOccurrence, CampusEventType, Reservation } from '@shared/types';
import { addDays, reservationDay } from '@/lib/reservation-format';

/**
 * Lo que muestra el calendario del inicio (SPEC-121), sin React: los eventos del
 * campus (SPEC-114) y las reservas de jardines (SPEC-107) llevados a una sola forma.
 * Las horas van en minutos desde la medianoche de Lima; `null` es «todo el día».
 */

export type CalendarEntryKind = CampusEventType | 'RESERVATION';

export interface CalendarEntry {
  key: string;
  kind: CalendarEntryKind;
  title: string;
  detail: string;
  date: string;
  start: number | null;
  end: number | null;
  href: string;
}

export interface LaidOutEntry {
  entry: CalendarEntry;
  /** Minutos que ocupa en la cuadrícula: un evento muy corto se estira para poder leerse. */
  start: number;
  end: number;
  column: number;
  columns: number;
}

export const MINUTES_IN_DAY = 24 * 60;
/** Lo mínimo que ocupa un bloque en la cuadrícula: media hora. */
const MIN_BLOCK_MINUTES = 30;

/** «09:00» o «9:00» en minutos. */
const minutesOf = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

function zoneText(o: CampusEventOccurrence): string {
  if (o.scope === 'CAMPUS') return 'Todo el campus';
  return `${o.zoneName ?? 'Zona'}${o.zoneActive ? '' : ' (zona dada de baja)'}`;
}

export function fromOccurrence(o: CampusEventOccurrence): CalendarEntry {
  const timed = o.startTime !== null && o.endTime !== null;
  return {
    key: `event:${o.eventId}:${o.date}`, kind: o.typeCode, title: o.name, detail: zoneText(o), date: o.date,
    start: timed ? minutesOf(o.startTime!) : null, end: timed ? minutesOf(o.endTime!) : null,
    href: `/calendario?fecha=${o.date}`,
  };
}

/**
 * Una reserva, partida en un tramo por cada día que toca. Las fechas llegan con el
 * desfase de Lima, así que su parte literal ya es la hora local (reservation-format).
 */
export function fromReservation(r: Reservation): CalendarEntry[] {
  if (r.state === 'CANCELLED') return [];
  const firstDay = reservationDay(r.startsAt), lastDay = reservationDay(r.endsAt);
  const startMinute = minutesOf(r.startsAt.slice(11, 16)), endMinute = minutesOf(r.endsAt.slice(11, 16));
  const detail = [r.requestedBy?.name, r.purpose].filter(Boolean).join(' · ');
  const parts: CalendarEntry[] = [];
  for (let day = firstDay; day <= lastDay; day = addDays(day, 1)) {
    const start = day === firstDay ? startMinute : 0;
    const end = day === lastDay ? endMinute : MINUTES_IN_DAY;
    if (end <= start) continue;
    parts.push({
      key: `reservation:${r.code}:${day}`, kind: 'RESERVATION', title: r.place.name, detail, date: day,
      start, end, href: `/reservas/${r.code}`,
    });
  }
  return parts;
}

/** Los de un día: primero los de todo el día y luego por hora de inicio. */
export function entriesOfDay(entries: readonly CalendarEntry[], date: string): CalendarEntry[] {
  return entries.filter((e) => e.date === date)
    .sort((a, b) => (a.start ?? -1) - (b.start ?? -1) || (a.end ?? 0) - (b.end ?? 0));
}

/**
 * Columnas para los que se cruzan, como Google Calendar: cada grupo de bloques que
 * se tocan se reparte el ancho; un hueco que se libera se reutiliza.
 */
export function layoutTimed(entries: readonly CalendarEntry[]): LaidOutEntry[] {
  const blocks = entries.filter((e) => e.start !== null && e.end !== null)
    .map((entry) => ({ entry, start: entry.start!, end: Math.max(entry.end!, entry.start! + MIN_BLOCK_MINUTES) }))
    .sort((a, b) => a.start - b.start || b.end - a.end);
  const laid: LaidOutEntry[] = [];
  let group: LaidOutEntry[] = [], groupEnd = -1;
  const closeGroup = () => { group.forEach((g) => { g.columns = Math.max(...group.map((x) => x.column)) + 1; }); };
  for (const block of blocks) {
    if (block.start >= groupEnd) { closeGroup(); group = []; }
    const busy = new Set(group.filter((g) => g.end > block.start).map((g) => g.column));
    let column = 0;
    while (busy.has(column)) column++;
    const placed = { ...block, column, columns: 1 };
    group.push(placed);
    laid.push(placed);
    groupEnd = Math.max(groupEnd, block.end);
  }
  closeGroup();
  return laid;
}
