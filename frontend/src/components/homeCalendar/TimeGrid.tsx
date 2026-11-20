'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import { entriesOfDay, layoutTimed, MINUTES_IN_DAY, type CalendarEntry, type LaidOutEntry } from './calendarEntries';
import { clock, ENTRY_CLASS } from './entryStyle';

/**
 * La cuadrícula por horas, como Google Calendar (SPEC-121): una columna por día,
 * los de todo el día arriba y los demás según su hora. Sirve para la semana y el día.
 */

const HOUR_PX = 48;
/** Al abrir, la cuadrícula muestra desde esta hora: la madrugada casi nunca tiene eventos. */
const FIRST_VISIBLE_HOUR = 7;
const HOURS = Array.from({ length: 24 }, (_, h) => h);
const WEEKDAY = new Intl.DateTimeFormat('es-PE', { weekday: 'short', timeZone: 'UTC' });

const px = (minutes: number) => (minutes / 60) * HOUR_PX;
const weekdayOf = (date: string) => WEEKDAY.format(new Date(`${date}T12:00:00Z`)).replace('.', '').toUpperCase();

interface TimeGridProps {
  days: string[];
  entries: readonly CalendarEntry[];
  today: string;
  nowMinute: number;
}

function Block({ laid }: { laid: LaidOutEntry }) {
  const { entry } = laid;
  return (
    <Link href={entry.href}
      className={cn('absolute overflow-hidden rounded-md border-l-4 px-1.5 py-0.5 text-xs leading-tight shadow-xs hover:z-10 hover:shadow-md',
        ENTRY_CLASS[entry.kind])}
      style={{ top: px(laid.start), height: px(laid.end - laid.start) - 2,
        left: `calc(${(laid.column / laid.columns) * 100}% + 2px)`, width: `calc(${100 / laid.columns}% - 4px)` }}>
      <span className="block truncate font-semibold">{entry.title}</span>
      <span className="block truncate">{clock(entry.start!)} – {clock(entry.end!)}</span>
      {entry.detail && <span className="block truncate opacity-80">{entry.detail}</span>}
    </Link>
  );
}

function AllDayChip({ entry }: { entry: CalendarEntry }) {
  return (
    <Link href={entry.href} className={cn('block truncate rounded-md px-1.5 py-0.5 text-xs font-medium', ENTRY_CLASS[entry.kind])}>
      {entry.title}
    </Link>
  );
}

export function TimeGrid({ days, entries, today, nowMinute }: TimeGridProps) {
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => { if (scroller.current) scroller.current.scrollTop = FIRST_VISIBLE_HOUR * HOUR_PX; }, []);
  const columns = { gridTemplateColumns: `3.5rem repeat(${days.length}, minmax(0, 1fr))` };
  const byDay = days.map((day) => entriesOfDay(entries, day));
  return (
    <div>
      <div className="grid border-b border-neutral-200" style={columns}>
        <div className="self-end pb-1 text-center text-[10px] text-neutral-500">GMT-5</div>
        {days.map((day) => (
          <div key={day} className="py-2 text-center">
            <div className="text-[11px] font-medium text-neutral-500">{weekdayOf(day)}</div>
            <div aria-current={day === today ? 'date' : undefined}
              className={cn('mx-auto mt-1 flex h-10 w-10 items-center justify-center rounded-full text-xl',
                day === today ? 'bg-brand-600 font-semibold text-white' : 'text-neutral-900')}>
              {Number(day.slice(8))}
            </div>
          </div>
        ))}
        <div className="self-center py-1 text-center text-[10px] text-neutral-500">Todo el día</div>
        {byDay.map((list, i) => (
          <div key={days[i]} className="space-y-0.5 border-l border-neutral-200 p-0.5">
            {list.filter((e) => e.start === null).map((e) => <AllDayChip key={e.key} entry={e} />)}
          </div>
        ))}
      </div>
      <div ref={scroller} className="max-h-[32rem] overflow-y-auto">
        <div className="relative grid" style={{ ...columns, height: px(MINUTES_IN_DAY) }}>
          <div className="relative">
            {HOURS.slice(1).map((h) => (
              <span key={h} className="absolute right-2 -translate-y-1/2 text-[11px] text-neutral-500" style={{ top: h * HOUR_PX }}>
                {clock(h * 60)}
              </span>
            ))}
          </div>
          {byDay.map((list, i) => (
            <div key={days[i]} className="relative border-l border-neutral-200"
              style={{ backgroundImage: `repeating-linear-gradient(to bottom, transparent 0 ${HOUR_PX - 1}px, rgb(229 231 235 / 0.7) ${HOUR_PX - 1}px ${HOUR_PX}px)` }}>
              {layoutTimed(list).map((laid) => <Block key={laid.entry.key} laid={laid} />)}
              {days[i] === today && (
                <div data-testid="now-line" className="pointer-events-none absolute inset-x-0 z-20 h-0.5 bg-red-500" style={{ top: px(nowMinute) }}>
                  <span className="absolute -left-1.5 -top-[5px] h-3 w-3 rounded-full bg-red-500" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
