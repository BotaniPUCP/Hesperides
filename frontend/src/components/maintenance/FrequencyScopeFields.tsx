'use client';

import type { GreenAreaSetSummary, MaintenanceScope } from '@shared/types';

const SELECT = 'w-full rounded-md border border-neutral-300 bg-neutral-0 px-3 py-2 text-sm focus:border-primary-500 focus:outline-hidden';
const LABEL = 'block text-xs font-medium text-neutral-600 mb-1';

interface Props {
  scope: MaintenanceScope;
  setId: number | null;
  sets: GreenAreaSetSummary[];
  onScope: (scope: MaintenanceScope) => void;
  onSet: (id: number | null) => void;
}

/** A qué se aplica una frecuencia: todo el campus o un conjunto guardado (SPEC-203 D-07). */
export function FrequencyScopeFields({ scope, setId, sets, onScope, onSet }: Props) {
  return (
    <>
      <div>
        <label htmlFor="frequency-scope" className={LABEL}>Se aplica a</label>
        <select id="frequency-scope" value={scope} onChange={(e) => onScope(e.target.value as MaintenanceScope)} className={SELECT}>
          <option value="CAMPUS_WIDE">Todo el campus</option>
          <option value="BY_SET">Un conjunto</option>
        </select>
      </div>
      {scope === 'BY_SET' && (
        <div className="sm:col-span-2">
          <label htmlFor="frequency-set" className={LABEL}>Conjunto</label>
          <select id="frequency-set" value={setId ?? 0} onChange={(e) => onSet(Number(e.target.value) || null)} className={SELECT}>
            <option value={0}>Elige un conjunto…</option>
            {sets.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <span className="mt-1 block text-xs text-neutral-500">
            Reemplaza a la frecuencia de todo el campus solo para los jardines de este conjunto.
          </span>
        </div>
      )}
    </>
  );
}
