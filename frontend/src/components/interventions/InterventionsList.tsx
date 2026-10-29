'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCatalog } from '@/hooks/useCatalog';
import { Button, EmptyState, LoadingSkeleton, Select, StatusBadge } from '@/components/ui';
import { interventionsApi, interventionError, type InterventionPage } from '@/lib/interventions-api';

export function InterventionsList() {
  const { user } = useAuth();
  const statuses = useCatalog('INTERVENTION_STATUS');
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<InterventionPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    interventionsApi.list(page, status, from, to).then(data => {
      if (active) { setResult(data); setError(''); }
    }).catch(e => { if (active) setError(interventionError(e)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, status, from, to, revision]);
  const reload = () => { setLoading(true); setRevision(n => n + 1); };
  const change = (action: () => void) => { setLoading(true); setPage(0); action(); };
  return <section className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div><h1 className="text-2xl font-bold">Intervenciones</h1><p className="text-neutral-500">Actividades y avances por ubicación</p></div>
      {['ADMIN','COORDINADOR'].includes(user?.role.code ?? '') && <Link className="rounded-md bg-brand-600 px-4 py-3 text-white" href="/intervenciones/nueva">Nueva intervención</Link>}
    </div>
    <div className="grid gap-4 rounded-lg border border-neutral-200 bg-neutral-0 p-4 sm:grid-cols-3">
      <Select id="intervention-status" label="Estado" value={status} onChange={o => change(() => setStatus(o?.code ?? ''))}
        options={statuses.items.map((s,i) => ({ id:i, code:s.code, label:s.label }))} placeholder="Todos los estados" clearable />
      <label className="grid gap-1 text-sm">Desde<input className="h-11 rounded-md border border-neutral-200 p-2" type="date" value={from} onChange={e => change(() => setFrom(e.target.value))} /></label>
      <label className="grid gap-1 text-sm">Hasta<input className="h-11 rounded-md border border-neutral-200 p-2" type="date" value={to} onChange={e => change(() => setTo(e.target.value))} /></label>
    </div>
    {error && <div role="alert" className="rounded-lg border border-action-danger p-4"><p>{error}</p><Button onClick={reload}>Reintentar</Button></div>}
    {loading ? <LoadingSkeleton variant="card" /> : !error && result?.content.length === 0 ? <EmptyState title="No hay intervenciones" description="Prueba con otras fechas o estados." /> : !error && <>
      <p className="text-sm text-neutral-500">{result?.page.totalElements} actividades</p>
      <div className="grid gap-4 lg:grid-cols-2">{result?.content.map(work => <article key={work.id} className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-0 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2"><Link href={`/intervenciones/${work.id}`} className="font-semibold text-brand-600 underline">{work.code}</Link>
          <StatusBadge code={work.statusCode} label={statuses.items.find(s => s.code === work.statusCode)?.label ?? work.statusCode} /></div>
        <p>Programada: {work.scheduledDate}</p><p>{work.completedLocationCount}/{work.locationCount} ubicaciones terminadas · {work.validatedLocationCount} aprobadas</p>
        {work.pendingEvidenceCount > 0 && <p className="text-sm">Fotos pendientes: {work.pendingEvidenceCount}</p>}
        {work.approvedForCounting && <p className="text-sm text-brand-600">Aprobación final del coordinador recibida</p>}
      </article>)}</div>
      <nav aria-label="Páginas de intervenciones" className="flex items-center justify-between gap-3">
        <Button variant="secondary" disabled={page === 0} onClick={() => { setLoading(true); setPage(n => n - 1); }}>Anterior</Button>
        <span>Página {page + 1} de {Math.max(1, result?.page.totalPages ?? 0)}</span>
        <Button variant="secondary" disabled={page + 1 >= (result?.page.totalPages ?? 0)} onClick={() => { setLoading(true); setPage(n => n + 1); }}>Siguiente</Button>
      </nav>
    </>}
  </section>;
}
