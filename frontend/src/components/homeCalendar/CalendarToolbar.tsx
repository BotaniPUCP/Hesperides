'use client';

import { cn } from '@/lib/cn';

/** Los controles del calendario del inicio: hoy, anterior, siguiente, el título y la vista. */

export type CalendarMode = 'week' | 'month';

interface CalendarToolbarProps {
  title: string;
  mode: CalendarMode;
  /** En el celular la vista por horas es de un día: el botón lo dice. */
  timeLabel: string;
  onToday: () => void;
  onShift: (delta: number) => void;
  onMode: (mode: CalendarMode) => void;
}

const BUTTON = 'rounded-full border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-800 hover:bg-neutral-100';
const ARROW = 'flex h-8 w-8 items-center justify-center rounded-full text-lg text-neutral-700 hover:bg-neutral-100';

export function CalendarToolbar({ title, mode, timeLabel, onToday, onShift, onMode }: CalendarToolbarProps) {
  const modes: [CalendarMode, string][] = [['week', timeLabel], ['month', 'Mes']];
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-neutral-200 p-3">
      <button type="button" className={BUTTON} onClick={onToday}>Hoy</button>
      <button type="button" className={ARROW} aria-label="Anterior" onClick={() => onShift(-1)}>‹</button>
      <button type="button" className={ARROW} aria-label="Siguiente" onClick={() => onShift(1)}>›</button>
      <h2 className="mr-auto text-lg font-semibold text-neutral-900">{title}</h2>
      <div className="flex overflow-hidden rounded-full border border-neutral-300">
        {modes.map(([value, label]) => (
          <button key={value} type="button" aria-pressed={mode === value} onClick={() => onMode(value)}
            className={cn('px-3 py-1.5 text-sm font-medium',
              mode === value ? 'bg-brand-600 text-white' : 'text-neutral-700 hover:bg-neutral-100')}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
