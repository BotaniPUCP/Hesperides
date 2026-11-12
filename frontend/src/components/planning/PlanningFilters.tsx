'use client';

import type { PlanningRow } from '@shared/types';
import { Card } from '@/components/ui';
import { STATE_LABELS } from './planningTexts';

const FIELD = 'w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-hidden';
const LABEL = 'mb-1 block text-sm font-medium text-neutral-700';

export const PLANNING_FILTERS = { conjunto: '', actividad: '', estado: '' } as const;
export type PlanningFilterValues = Record<keyof typeof PLANNING_FILTERS, string>;

/** Las tarjetas que pasan los filtros. El conjunto se busca por nombre, sin distinguir mayúsculas ni tildes. */
export function filterRows(rows: PlanningRow[], f: PlanningFilterValues): PlanningRow[] {
  const text = fold(f.conjunto.trim());
  return rows.filter((r) =>
    (!text || fold(r.setName).includes(text))
    && (!f.actividad || String(r.activityTypeItemId) === f.actividad)
    && (!f.estado || r.state === f.estado));
}

const fold = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

interface Props {
  rows: PlanningRow[];
  value: PlanningFilterValues;
  onChange: (patch: Partial<PlanningFilterValues>) => void;
}

/**
 * Los filtros de la planificación. Las opciones salen de las tarjetas que hay: no se ofrece
 * una actividad o un estado que no dejaría ninguna.
 */
export function PlanningFilters({ rows, value, onChange }: Props) {
  const activities = unique(rows.map((r) => [String(r.activityTypeItemId), r.activityLabel ?? 'Actividad'] as const));
  const states = (Object.keys(STATE_LABELS) as PlanningRow['state'][]).filter((s) => rows.some((r) => r.state === s));

  return (
    <Card>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="block">
          <span className={LABEL}>Buscar conjunto</span>
          <input type="search" value={value.conjunto} onChange={(e) => onChange({ conjunto: e.target.value })}
            placeholder="Ej. Polideportivo" className={FIELD} />
        </label>
        <label className="block">
          <span className={LABEL}>Actividad</span>
          <select value={value.actividad} onChange={(e) => onChange({ actividad: e.target.value })} className={`${FIELD} bg-neutral-0`}>
            <option value="">Todas las actividades</option>
            {activities.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>
        <label className="block">
          <span className={LABEL}>Estado</span>
          <select value={value.estado} onChange={(e) => onChange({ estado: e.target.value })} className={`${FIELD} bg-neutral-0`}>
            <option value="">Todos los estados</option>
            {states.map((s) => <option key={s} value={s}>{STATE_LABELS[s]}</option>)}
          </select>
        </label>
      </div>
    </Card>
  );
}

/** Pares sin repetir, ordenados por su texto. */
function unique(pairs: (readonly [string, string])[]): (readonly [string, string])[] {
  return [...new Map(pairs).entries()].sort((a, b) => a[1].localeCompare(b[1], 'es'));
}
