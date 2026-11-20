'use client';

import { useState } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useRequest } from '@/hooks/useRequest';
import type { CalendarEntry } from './calendarEntries';
import { rangeOf, shiftAnchor, titleOf, weekOf, type CalendarView } from './calendarDates';
import { CalendarToolbar, type CalendarMode } from './CalendarToolbar';
import { loadCalendarEntries } from './loadCalendar';
import { MonthGrid } from './MonthGrid';
import { TimeGrid } from './TimeGrid';
import { useLimaNow } from './useLimaNow';

/**
 * El calendario del inicio (SPEC-121): los eventos del campus y las reservas de
 * jardines en una vista de semana por horas o de mes, como Google Calendar. En el
 * celular la vista por horas es de un día: siete columnas no caben.
 */

const MOBILE = '(max-width: 639px)';

export function HomeCalendar() {
  const mobile = useMediaQuery(MOBILE);
  const { today, minute } = useLimaNow();
  const [mode, setMode] = useState<CalendarMode>('week');
  const [anchor, setAnchor] = useState(today);
  const view: CalendarView = mode === 'month' ? 'month' : mobile ? 'day' : 'week';
  const { from, to } = rangeOf(view, anchor);
  const { data, errorMessage } = useRequest(`home-calendar:${from}:${to}`,
    () => loadCalendarEntries(from, to), { keepPreviousData: true });
  const entries = (data ?? []) as CalendarEntry[];

  const showDay = (date: string) => { setAnchor(date); setMode('week'); };
  return (
    <section aria-label="Calendario" className="overflow-hidden rounded-2xl border border-neutral-200/90 bg-neutral-0 shadow-xs">
      <CalendarToolbar title={titleOf(view, anchor)} mode={mode} timeLabel={mobile ? 'Día' : 'Semana'}
        onToday={() => setAnchor(today)} onShift={(delta) => setAnchor(shiftAnchor(view, anchor, delta))} onMode={setMode} />
      {errorMessage && (
        <p role="alert" className="m-3 rounded-md bg-alert-danger-bg p-3 text-sm text-alert-danger-fg">
          No se pudo cargar el calendario. {errorMessage}
        </p>
      )}
      {view === 'month'
        ? <MonthGrid month={anchor.slice(0, 7)} entries={entries} today={today} onShowDay={showDay} />
        : <TimeGrid days={view === 'day' ? [anchor] : weekOf(anchor)} entries={entries} today={today} nowMinute={minute} />}
    </section>
  );
}
