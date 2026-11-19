'use client';

import { useId, useState } from 'react';
import { Input } from '@/components/ui';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useRequest } from '@/hooks/useRequest';
import { incidentsApi } from '@/lib/incidents-api';

/** Busca intervenciones no canceladas por código o descripción y elige una (SPEC-201 §3.8). */
export function InterventionPicker({ value, onChange, disabled }: {
  value: number | null; onChange: (id: number | null) => void; disabled: boolean;
}) {
  const name = useId();
  const [text, setText] = useState('');
  const query = useDebouncedValue(text.trim(), 300);
  const found = useRequest(query ? `intervention-candidates:${query}` : null, () => incidentsApi.candidates(query));
  return <div className="space-y-2">
    <Input id={`${name}-search`} label="Buscar actividad por código o descripción" size="lg" value={text}
      maxLength={100} disabled={disabled} onChange={(v) => { setText(v); onChange(null); }} />
    {found.loading && <p role="status" className="text-sm">Buscando…</p>}
    {found.errorMessage && <p role="alert" className="text-sm text-action-danger">{found.errorMessage}</p>}
    {found.data?.length === 0 && <p className="text-sm text-neutral-700">Sin coincidencias. Las canceladas no aparecen.</p>}
    {found.data && found.data.length > 0 && <fieldset className="max-h-64 space-y-2 overflow-auto">
      <legend className="sr-only">Actividades encontradas</legend>
      {found.data.map((w) => <label key={w.id} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-md border border-neutral-200 px-3 text-sm">
        <input type="radio" name={name} checked={value === w.id} disabled={disabled} onChange={() => onChange(w.id)} />
        <span><span className="font-medium">{w.code}</span> · {w.description || 'Sin descripción'}</span>
      </label>)}
    </fieldset>}
  </div>;
}
