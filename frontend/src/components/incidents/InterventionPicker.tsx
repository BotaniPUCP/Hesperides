'use client';

import { useId, useMemo, useState } from 'react';
import { ListStatus } from '@/components/search/ListStatus';
import { Input } from '@/components/ui';
import { usePreloadedList } from '@/hooks/usePreloadedList';
import { interventionCandidatesList } from '@/lib/preload/incidentLists';
import { filterByText } from '@/lib/search/searchText';

/**
 * Busca intervenciones no canceladas por código o descripción y elige una (SPEC-201 §3.8). La lista
 * se carga al abrir el formulario y se filtra en el navegador mientras se escribe (SPEC-119).
 */
export function InterventionPicker({ value, onChange, disabled }: {
  value: number | null; onChange: (id: number | null) => void; disabled: boolean;
}) {
  const name = useId();
  const [text, setText] = useState('');
  const list = usePreloadedList(interventionCandidatesList);
  const query = text.trim();
  const found = useMemo(() => (query ? filterByText(list.items, query) : []), [list.items, query]);
  return <div className="space-y-2">
    <Input id={`${name}-search`} label="Buscar actividad por código o descripción" size="lg" value={text}
      maxLength={100} disabled={disabled} onChange={(v) => { setText(v); onChange(null); }} />
    <ListStatus typed={query !== ''} loaded={list.loaded} errorMessage={list.errorMessage} onRetry={list.reload} />
    {list.loaded && query && found.length === 0 && <p className="text-sm text-neutral-700">Sin coincidencias. Las canceladas no aparecen.</p>}
    {found.length > 0 && <fieldset className="max-h-64 space-y-2 overflow-auto">
      <legend className="sr-only">Actividades encontradas</legend>
      {found.map((w) => <label key={w.id} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-md border border-neutral-200 px-3 text-sm">
        <input type="radio" name={name} checked={value === w.id} disabled={disabled} onChange={() => onChange(w.id)} />
        <span><span className="font-medium">{w.code}</span> · {w.description || 'Sin descripción'}</span>
      </label>)}
    </fieldset>}
  </div>;
}
