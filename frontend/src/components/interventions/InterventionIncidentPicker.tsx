'use client';

import { useMemo, useState } from 'react';
import type { IncidentRef } from '@shared/types';
import { ListStatus } from '@/components/search/ListStatus';
import { Button, Input } from '@/components/ui';
import { usePreloadedList } from '@/hooks/usePreloadedList';
import { linkableIncidentsList } from '@/lib/preload/incidentLists';
import { filterByText } from '@/lib/search/searchText';

/**
 * Incidencias que atiende la intervención, elegidas por código o título (SPEC-201 §3.8). Es opcional:
 * solo aparecen las activas y abiertas, y el vínculo se ve también desde cada incidencia. La lista se
 * carga al abrir el formulario y se filtra en el navegador mientras se escribe (SPEC-119).
 */
export function InterventionIncidentPicker({ value, onChange, disabled }: {
  value: IncidentRef[]; onChange: (incidents: IncidentRef[]) => void; disabled: boolean;
}) {
  const [text, setText] = useState('');
  const list = usePreloadedList(linkableIncidentsList);
  const query = text.trim();
  const found = useMemo(() => (query ? filterByText(list.items, query) : []), [list.items, query]);
  const chosen = new Set(value.map((i) => i.id));
  const add = (incident: IncidentRef) => { onChange([...value, incident]); setText(''); };
  return <fieldset className="space-y-3">
    <legend className="text-sm font-medium text-neutral-900">Incidencias que atiende (opcional)</legend>
    {value.length > 0 && <ul className="flex flex-wrap gap-2">{value.map((i) => <li key={i.id}
      className="flex items-center gap-2 rounded-full border border-neutral-200 px-3 py-1 text-sm">
      <span>{i.code}{i.title ? ` · ${i.title}` : ''}</span>
      <Button type="button" variant="ghost" size="md" disabled={disabled} aria-label={`Quitar ${i.code}`}
        onClick={() => onChange(value.filter((x) => x.id !== i.id))}>×</Button>
    </li>)}</ul>}
    <Input id="work-incident-search" label="Buscar incidencia por código o título" size="lg" value={text} maxLength={100}
      disabled={disabled} onChange={setText} />
    <ListStatus typed={query !== ''} loaded={list.loaded} errorMessage={list.errorMessage} onRetry={list.reload} />
    {list.loaded && query && found.length === 0 && <p className="text-sm text-neutral-700">Sin incidencias activas con ese texto.</p>}
    {found.length > 0 && <ul className="space-y-2">{found.filter((i) => !chosen.has(i.id)).map((i) => <li key={i.id}>
      <Button type="button" variant="secondary" size="lg" disabled={disabled} onClick={() => add(i)}>
        Agregar {i.code}{i.title ? ` · ${i.title}` : ''}</Button>
    </li>)}</ul>}
  </fieldset>;
}
