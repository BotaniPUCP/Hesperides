'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button, Card, Input } from '@/components/ui';
import { useRequest } from '@/hooks/useRequest';
import { incidentsApi } from '@/lib/incidents-api';

export function IncidentPreviousCases({ incidentId, disabled }: { incidentId: number; disabled: boolean }) {
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [revision, setRevision] = useState(0);
  const request = useRequest(query ? `incident:${incidentId}:previous:${query}:${revision}` : null,
    () => incidentsApi.list(0, 'RESOLVED', query));
  return <Card title="Consultar casos cerrados">
    <div className="space-y-3">
      <p className="text-sm text-neutral-700">Consulta acciones realizadas anteriormente como referencia. No se copian causas ni planes automáticamente.</p>
      <Input id="previous-incident-search" label="Buscar por problema o lugar" size="lg" value={text} maxLength={200} disabled={disabled} onChange={setText} />
      <Button type="button" size="lg" variant="secondary" disabled={disabled || !text.trim() || request.loading}
        onClick={() => { setQuery(text.trim()); setRevision((v) => v + 1); }}>Buscar casos cerrados</Button>
      {request.loading && <p role="status" className="text-sm">Consultando…</p>}
      {request.errorMessage && <p role="alert" className="text-sm text-action-danger">{request.errorMessage}</p>}
      {request.data && <ul className="space-y-3">{request.data.content.filter((i) => i.id !== incidentId).map((i) => <li key={i.id}>
        <Link href={`/incidencias/${i.id}`} target="_blank" rel="noopener noreferrer" className="block break-words rounded-md border border-neutral-200 p-3 text-sm text-brand-700 underline">
          {i.officialCode ?? `#${i.id}`} · {i.description} (abre otra pestaña)
        </Link>
      </li>)}</ul>}
      {request.data?.content.length === 0 && <p className="text-sm text-neutral-700">No hay casos cerrados con esos términos.</p>}
      {request.data && request.data.page.totalPages > 1 && <Link href={`/incidencias?status=RESOLVED&search=${encodeURIComponent(query)}`} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-700 underline">Ver todos los resultados (otra pestaña)</Link>}
    </div>
  </Card>;
}
