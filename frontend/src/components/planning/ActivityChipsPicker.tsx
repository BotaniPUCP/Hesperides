'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/cn';
import { groupActivities, type ActivityOption } from '@/components/maintenance/activityGroups';

interface Props {
  activities: ActivityOption[];
  selected: Set<number>;
  onToggle: (id: number) => void;
}

const FOCUS = 'focus:outline-hidden focus-visible:ring-2 focus-visible:ring-forest-600 focus-visible:ring-offset-2';
/** Los grupos son pestañas, como en Directorio y Reportes; las actividades son chips. */
const GROUP = 'inline-flex min-h-10 items-center gap-2 border-b-2 px-3 py-2 text-sm font-semibold transition-colors';
const CHIP = 'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm transition-colors duration-150';
const CHOSEN = 'border-brand-600 bg-brand-50 text-brand-900';

/**
 * Elegir las actividades de un conjunto: primero el grupo, luego sus actividades
 * como chips, con las ya elegidas resumidas abajo. Reemplaza a decenas de
 * casillas que había que recorrer enteras para saber qué estaba marcado.
 */
export function ActivityChipsPicker({ activities, selected, onToggle }: Props) {
  const groups = useMemo(() => groupActivities(activities), [activities]);
  const [current, setCurrent] = useState(() =>
    (groups.find((g) => g.activities.some((a) => selected.has(a.id))) ?? groups[0])?.label ?? '');
  const shown = groups.find((g) => g.label === current)?.activities ?? [];
  const chosen = activities.filter((a) => selected.has(a.id));

  return (
    <div className="space-y-3">
      <div role="tablist" aria-label="Grupos de actividades" className="flex flex-wrap gap-x-1 border-b border-neutral-200">
        {groups.map((g) => {
          const count = g.activities.filter((a) => selected.has(a.id)).length;
          const active = g.label === current;
          return (
            <button key={g.label} type="button" role="tab" aria-selected={active} onClick={() => setCurrent(g.label)}
              className={cn(GROUP, FOCUS, active
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-neutral-700 hover:text-neutral-900')}>
              {g.label}
              {count > 0 && (
                <span className="rounded-full bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand-900">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" aria-label={current} className="flex flex-wrap gap-2">
        {shown.map((a) => {
          const on = selected.has(a.id);
          return (
            <button key={a.id} type="button" aria-pressed={on} onClick={() => onToggle(a.id)}
              className={cn(CHIP, FOCUS, on ? CHOSEN : 'border-neutral-300 bg-neutral-0 text-neutral-800 hover:bg-neutral-100')}>
              {on && <span aria-hidden="true">✓</span>}
              {a.label}
            </button>
          );
        })}
      </div>

      <div className="border-t border-neutral-200 pt-3">
        <p className="mb-2 text-xs font-medium text-neutral-600">
          {chosen.length === 0 ? 'Todavía no eliges actividades' : `Elegidas (${chosen.length})`}
        </p>
        <div className="flex flex-wrap gap-2">
          {chosen.map((a) => (
            <button key={a.id} type="button" onClick={() => onToggle(a.id)} aria-label={`Quitar ${a.label}`}
              className={cn(CHIP, FOCUS, CHOSEN, 'hover:bg-brand-100')}>
              {a.label}
              <span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
