'use client';

import { useState, type ReactNode } from 'react';
import type { IncidentOption, LinkedIncidentIntervention } from '@shared/types';
import { Button, Input, LoadingSkeleton, StatusBadge } from '@/components/ui';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useRequest } from '@/hooks/useRequest';
import { incidentsApi } from '@/lib/incidents-api';

interface IncidentWorkSearchProps {
  incidentId?: number; scopeKey: string; disabled: boolean; excludedIds: number[];
  onSelect: (work: LinkedIncidentIntervention) => void;
  creationAction?: ReactNode;
  statuses?: IncidentOption[];
}

/** Both entry points use the same authorized, server-paginated search. */
export function IncidentWorkSearch({ incidentId, scopeKey, disabled, excludedIds, onSelect, creationAction, statuses = [] }: IncidentWorkSearchProps) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [retry, setRetry] = useState(0);
  const query = useDebouncedValue(search.trim(), 300);
  const request = useRequest(`incident-work:${scopeKey}:${incidentId ?? 'capture'}:${query}:${page}:${retry}`,
    () => incidentId ? incidentsApi.interventionOptions(incidentId, query, page) : incidentsApi.availableInterventions(query, page));
  const waiting = request.loading || query !== search.trim();
  return <section className="space-y-4 rounded-lg border border-neutral-300 bg-neutral-0 p-4 sm:p-5" aria-label="Buscar intervenciones">
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-0 flex-1"><Input id={`work-search-${scopeKey}`} label="Buscar intervención por código o descripción" type="search" size="lg"
        value={search} disabled={disabled} maxLength={200} placeholder="Código o descripción…"
        onChange={(value) => { setSearch(value); setPage(0); }} /></div>
      {creationAction}
    </div>
    <div aria-live="polite" aria-busy={waiting}>
      {waiting ? <><p className="mb-2 text-sm text-neutral-700">Buscando intervenciones…</p><LoadingSkeleton variant="card" /></>
        : request.errorMessage || request.notFound ? <div role="alert" className="space-y-2 text-alert-danger-fg">
          <p>{request.errorMessage ?? 'No se pudo consultar los trabajos disponibles.'}</p>
          <Button variant="secondary" onClick={() => setRetry(v => v + 1)}>Reintentar búsqueda</Button>
        </div> : <>
          <p className="mb-3 text-sm text-neutral-600">{request.data?.page.totalElements ?? 0} resultados · Página {page + 1}</p>
          {!request.data?.content.length ? <p className="rounded-md bg-neutral-50 p-5 text-sm text-neutral-700">No hay intervenciones que coincidan. Prueba otro código o descripción.</p>
            : <ul className="max-h-80 overflow-y-auto divide-y divide-neutral-200 pr-2" aria-label="Resultados de intervenciones">{request.data.content.map(work => <li key={work.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-brand-800">{work.code}</p><p className="break-words text-sm text-neutral-900">{work.description}</p>
                <StatusBadge code={work.statusCode} label={statuses.find(s => s.code === work.statusCode)?.label ?? 'Consultar estado'} /></div>
              <Button variant="secondary" disabled={disabled || excludedIds.includes(work.id) || work.statusCode === 'CANCELLED'}
                onClick={() => onSelect(work)} aria-label={`Añadir ${work.code}`}>{excludedIds.includes(work.id) ? 'Seleccionada' : 'Añadir'}</Button>
            </li>)}</ul>}
        </>}
    </div>
    {request.data && request.data.page.totalPages > 1 && <div className="flex items-center justify-between gap-3 border-t border-neutral-200 pt-3">
      <Button variant="ghost" disabled={disabled || waiting || page === 0} onClick={() => setPage(v => v - 1)}>Anteriores</Button>
      <Button variant="ghost" disabled={disabled || waiting || page + 1 >= request.data.page.totalPages} onClick={() => setPage(v => v + 1)}>Siguientes</Button>
    </div>}
  </section>;
}
