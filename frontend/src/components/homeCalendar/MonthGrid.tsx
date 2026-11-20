'use client';

import Link from 'next/link';
import { cn } from '@/lib/cn';
import { entriesOfDay, type CalendarEntry } from './calendarEntries';
import { monthGrid } from './calendarDates';
import { clock, ENTRY_DOT } from './entryStyle';

/** El mes completo, como la vista de mes de Google Calendar (SPEC-121). */

/** Cuántos eventos caben en una celda; el resto se resume en «N más». */
const MAX_CHIPS = 3;
const WEEKDAYS = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

interface MonthGridProps {
  month: string;
  entries: readonly CalendarEntry[];
  today: string;
  /** Abre ese día en la vista por horas. */
  onShowDay: (date: string) => void;
}

function Chip({ entry }: { entry: CalendarEntry }) {
  return (
    <Link href={entry.href} className="flex items-center gap-1 truncate rounded px-1 text-xs text-neutral-800 hover:bg-neutral-100">
      <span className={cn('h-2 w-2 shrink-0 rounded-full', ENTRY_DOT[entry.kind])} />
      {entry.start !== null && <span className="shrink-0 text-neutral-500">{clock(entry.start)}</span>}
      <span className="truncate">{entry.title}</span>
    </Link>
  );
}

export function MonthGrid({ month, entries, today, onShowDay }: MonthGridProps) {
  const weeks = monthGrid(month);
  return (
    <div>
      <div className="grid grid-cols-7 border-b border-neutral-200">
        {WEEKDAYS.map((d) => <div key={d} className="py-2 text-center text-[11px] font-medium text-neutral-500">{d}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {weeks.flat().map((day) => {
          const list = entriesOfDay(entries, day);
          const hidden = list.length - MAX_CHIPS;
          return (
            <div key={day} className={cn('min-h-24 border-b border-l border-neutral-200 p-1',
              day.slice(0, 7) !== month && 'bg-neutral-50')}>
              <button type="button" onClick={() => onShowDay(day)} aria-current={day === today ? 'date' : undefined}
                className={cn('mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-full text-xs',
                  day === today ? 'bg-brand-600 font-semibold text-white' : 'text-neutral-700 hover:bg-neutral-100',
                  day.slice(0, 7) !== month && day !== today && 'text-neutral-400')}>
                {Number(day.slice(8))}
              </button>
              <div className="space-y-0.5">
                {list.slice(0, MAX_CHIPS).map((e) => <Chip key={e.key} entry={e} />)}
                {hidden > 0 && (
                  <button type="button" onClick={() => onShowDay(day)}
                    className="w-full rounded px-1 text-left text-xs font-medium text-neutral-600 hover:bg-neutral-100">
                    {hidden} más
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
