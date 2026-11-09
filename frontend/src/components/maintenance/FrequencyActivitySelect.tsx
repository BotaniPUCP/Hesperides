'use client';

import { useMemo } from 'react';

export interface ActivityOption {
  id: number;
  code: string;
  label: string;
  parentCode?: string | null;
}

const SELECT = 'w-full rounded-md border border-neutral-300 bg-neutral-0 px-3 py-2 text-sm focus:border-primary-500 focus:outline-hidden';

interface Props {
  activities: ActivityOption[];
  value: number;
  onChange: (id: number) => void;
  /** Al editar, la actividad es la identidad de la regla y no se cambia. */
  locked: boolean;
}

/** Las actividades agrupadas por su clase. */
export function FrequencyActivitySelect({ activities, value, onChange, locked }: Props) {
  const grouped = useMemo(() => {
    const groups: Record<string, ActivityOption[]> = {};
    for (const act of activities) (groups[act.parentCode || 'Otras actividades'] ??= []).push(act);
    return groups;
  }, [activities]);

  return (
    <div className="sm:col-span-2">
      <label htmlFor="frequency-activity" className="mb-1 block text-xs font-medium text-neutral-600">Actividad</label>
      <select id="frequency-activity" value={value} onChange={(e) => onChange(Number(e.target.value))} disabled={locked}
        className={`${SELECT} disabled:bg-neutral-100 disabled:text-neutral-500`}>
        <option value={0}>Selecciona una actividad…</option>
        {Object.entries(grouped).map(([grupo, items]) => (
          <optgroup key={grupo} label={grupo}>
            {items.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
          </optgroup>
        ))}
      </select>
      {locked && (
        <span className="mt-1 block text-xs text-neutral-500">
          La actividad es la identidad de la regla: para cambiarla, desactiva esta y crea otra.
        </span>
      )}
    </div>
  );
}
