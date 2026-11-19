'use client';

import { useMemo, useState } from 'react';
import { groupActivities, groupOf, type ActivityOption } from './activityGroups';

export type { ActivityOption } from './activityGroups';

const SELECT = 'w-full rounded-md border border-neutral-300 bg-neutral-0 px-3 py-2 text-sm focus:border-primary-500 focus:outline-hidden disabled:bg-neutral-100 disabled:text-neutral-500';
const LABEL = 'mb-1 block text-sm font-medium text-neutral-700';

interface Props {
  activities: ActivityOption[];
  value: number;
  onChange: (id: number) => void;
  /** Al editar, la actividad es la identidad de la regla y no se cambia. */
  locked: boolean;
}

/**
 * La actividad se elige en dos pasos: primero el grupo y luego la actividad de ese
 * grupo. Con decenas de actividades, un solo desplegable obligaba a recorrerlas todas.
 */
export function FrequencyActivitySelect({ activities, value, onChange, locked }: Props) {
  const groups = useMemo(() => groupActivities(activities), [activities]);
  const current = activities.find((a) => a.id === value);
  const [group, setGroup] = useState(() => (current ? groupOf(current) : ''));
  const options = groups.find((g) => g.label === group)?.activities ?? [];

  const chooseGroup = (label: string) => {
    setGroup(label);
    // La actividad anterior pertenece a otro grupo: se vuelve a elegir.
    if (current && groupOf(current) !== label) onChange(0);
  };

  return (
    <>
      <div>
        <label htmlFor="frequency-activity-group" className={LABEL}>Grupo de actividades</label>
        <select id="frequency-activity-group" value={group} disabled={locked}
          onChange={(e) => chooseGroup(e.target.value)} className={SELECT}>
          <option value="">Selecciona un grupo…</option>
          {groups.map((g) => <option key={g.label} value={g.label}>{g.label}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="frequency-activity" className={LABEL}>Actividad</label>
        <select id="frequency-activity" value={value} disabled={locked || !group}
          onChange={(e) => onChange(Number(e.target.value))} className={SELECT}>
          <option value={0}>{group ? 'Selecciona una actividad…' : 'Primero elige el grupo'}</option>
          {options.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
        </select>
      </div>
      {locked && (
        <span className="block text-xs text-neutral-500 sm:col-span-2">
          La actividad es la identidad de la regla: para cambiarla, desactiva esta y crea otra.
        </span>
      )}
    </>
  );
}
