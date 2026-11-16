'use client';

import type { CampusEventScope, SectorSections } from '@shared/types';
import { Select, type SelectOption } from '@/components/ui';
import { useRequest } from '@/hooks/useRequest';
import { greenAreaSetsApi } from '@/lib/green-area-sets-api';

const SCOPES: { value: CampusEventScope; label: string }[] = [
  { value: 'CAMPUS', label: 'Todo el campus' }, { value: 'SECTOR', label: 'Un sector' }, { value: 'SECTION', label: 'Una sección' },
];

interface Props {
  scope: CampusEventScope;
  zoneId: number | null;
  /** Un feriado es siempre de todo el campus (SPEC-114 D-02). */
  locked: boolean;
  onChange: (scope: CampusEventScope, zoneId: number | null) => void;
}

const option = (id: number, label: string): SelectOption => ({ id, code: String(id), label });

/** Dónde aplica un evento: todo el campus, un sector o una sección (SPEC-114 §5.1). */
export function ScopePicker({ scope, zoneId, locked, onChange }: Props) {
  const { data, loading } = useRequest(scope === 'CAMPUS' ? null : 'campus-event-zones',
    () => greenAreaSetsApi.sectionOptions());
  const sectors = (data ?? []) as SectorSections[];
  const options = scope === 'SECTOR'
    ? sectors.map((s) => option(s.id, s.name))
    : sectors.flatMap((s) => s.sections.map((z) => option(z.id, `${z.name} · ${s.name}`)));

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-neutral-700">Ámbito</legend>
      <div role="group" className="flex flex-wrap gap-1">
        {SCOPES.map((s) => (
          <button key={s.value} type="button" aria-pressed={scope === s.value} disabled={locked && s.value !== 'CAMPUS'}
            onClick={() => onChange(s.value, null)}
            className={`rounded-md px-3 py-1 text-sm disabled:opacity-50 ${scope === s.value ? 'bg-forest-700 text-white' : 'border border-neutral-200 hover:bg-neutral-50'}`}>
            {s.label}
          </button>
        ))}
      </div>
      {locked && <p className="text-xs text-neutral-600">Un feriado aplica a todo el campus.</p>}
      {scope !== 'CAMPUS' && (
        <Select id="campus-event-zone" label={scope === 'SECTOR' ? 'Sector' : 'Sección'} required searchable
          loading={loading} value={zoneId === null ? null : String(zoneId)} options={options}
          onChange={(o) => onChange(scope, o ? o.id : null)} />
      )}
    </fieldset>
  );
}
