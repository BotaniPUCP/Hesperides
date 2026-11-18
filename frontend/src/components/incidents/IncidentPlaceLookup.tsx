'use client';

import { useMemo, useState } from 'react';
import { ListStatus } from '@/components/search/ListStatus';
import { Button, Input } from '@/components/ui';
import { usePlaceList } from '@/hooks/usePlaces';
import { filterByText } from '@/lib/search/searchText';

const MAX_RESULTS = 20;

/**
 * Public place names and aliases only: selecting a name never invents a GPS point. The catalogue
 * loads when the section opens and is filtered in the browser while typing (SPEC-119).
 */
export function IncidentPlaceLookup({ disabled, onChoose }: { disabled: boolean; onChoose: (reference: string) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const list = usePlaceList(open);
  const search = text.trim();
  const found = useMemo(() => (search === '' ? [] : filterByText(list.items, search)), [list.items, search]);
  return <details className="rounded-md border border-neutral-200 p-3" onToggle={(e) => setOpen(e.currentTarget.open)}>
    <summary className="cursor-pointer py-2 text-sm font-medium text-brand-700">Buscar un lugar conocido (opcional)</summary>
    <div className="mt-3 space-y-3">
      <Input id="incident-place-search" label="Nombre o alias del lugar" size="lg" value={text} disabled={disabled}
        maxLength={100} onChange={setText} />
      <ListStatus typed={search !== ''} loaded={list.loaded} errorMessage={list.errorMessage} onRetry={list.reload} />
      {found.length > 0 && <ul className="max-h-64 space-y-2 overflow-auto">{found.slice(0, MAX_RESULTS).map((place) => <li key={place.code}>
        <Button type="button" variant="ghost" size="lg" fullWidth disabled={disabled} onClick={() => onChoose(place.name)}>
          <span className="min-w-0 whitespace-normal break-words text-left">{place.name}</span>
        </Button>
      </li>)}</ul>}
      {list.loaded && search !== '' && found.length === 0 && <p className="text-sm text-neutral-700">Sin coincidencias. Puedes escribir la referencia directamente.</p>}
      <p className="text-xs text-neutral-700">Confirma el lugar observado. Elegir una referencia no cambia las coordenadas del reporte.</p>
    </div>
  </details>;
}
