'use client';

import { useState } from 'react';
import { Button, Input } from '@/components/ui';
import { useRequest } from '@/hooks/useRequest';
import { placesApi } from '@/lib/places-api';

/** Public place names and aliases only: selecting a name never invents a GPS point. */
export function IncidentPlaceLookup({ disabled, onChoose }: { disabled: boolean; onChoose: (reference: string) => void }) {
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [revision, setRevision] = useState(0);
  const request = useRequest(query ? `incident-place:${query}:${revision}` : null, () => placesApi.list({ search: query }));
  return <details className="rounded-md border border-neutral-200 p-3">
    <summary className="cursor-pointer py-2 text-sm font-medium text-brand-700">Buscar un lugar conocido (opcional)</summary>
    <div className="mt-3 space-y-3">
      <Input id="incident-place-search" label="Nombre o alias del lugar" size="lg" value={text} disabled={disabled}
        maxLength={100} onChange={setText} />
      <Button type="button" variant="secondary" size="lg" disabled={disabled || !text.trim() || request.loading}
        onClick={() => { setQuery(text.trim()); setRevision((v) => v + 1); }}>Buscar lugar</Button>
      {request.loading && <p role="status" className="text-sm">Buscando lugares…</p>}
      {request.errorMessage && <p role="alert" className="text-sm text-action-danger">{request.errorMessage} Puedes escribir la referencia directamente.</p>}
      {request.data && <ul className="max-h-64 space-y-2 overflow-auto">{request.data.slice(0, 20).map((place) => <li key={place.code}>
        <Button type="button" variant="ghost" size="lg" fullWidth disabled={disabled} onClick={() => onChoose(place.name)}>
          <span className="min-w-0 whitespace-normal break-words text-left">{place.name}</span>
        </Button>
      </li>)}</ul>}
      {request.data?.length === 0 && <p className="text-sm text-neutral-700">Sin coincidencias. Puedes escribir la referencia directamente.</p>}
      <p className="text-xs text-neutral-700">Confirma el lugar observado. Elegir una referencia no cambia las coordenadas del reporte.</p>
    </div>
  </details>;
}
