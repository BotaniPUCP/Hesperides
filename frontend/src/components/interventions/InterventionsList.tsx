'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCatalog } from '@/hooks/useCatalog';
import { useListScrollRestoration } from '@/hooks/useListScrollRestoration';
import { useListUrlState } from '@/hooks/useListUrlState';
import { BackButton, Button, EmptyState, LoadingSkeleton, Select, StatusBadge } from '@/components/ui';
import { interventionsApi, interventionError, type InterventionPage } from '@/lib/interventions-api';
import { isoDateFrom, pageFrom } from '@/lib/listUrl';

const LIST_PATH = '/intervenciones';
// greenElementCode lo fija el enlace de entrada; va aquí para que filtrar no lo borre de la URL.
const DEFAULTS = { greenElementCode: '', status: '', from: '', to: '', page: '0' };

export function InterventionsList({ greenElementCode }: { greenElementCode?:string }) {
  const { user } = useAuth();
  const statuses = useCatalog('INTERVENTION_STATUS');
  const { values, setValues, query } = useListUrlState(LIST_PATH, DEFAULTS);
  const page = pageFrom(values.page);
  const status = values.status;
  const from = isoDateFrom(values.from);
  const to = isoDateFrom(values.to);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<InterventionPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useListScrollRestoration(LIST_PATH, query, !loading);
  useEffect(() => {
    let active = true;
    interventionsApi.list(page, status, from, to, greenElementCode).then(data => {
      if (active) { setResult(data); setError(''); }
    }).catch(e => { if (active) setError(interventionError(e)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, status, from, to, revision, greenElementCode]);
  const reload = () => { setLoading(true); setRevision(n => n + 1); };
  const change = (patch: Partial<typeof DEFAULTS>) => { setLoading(true); setValues({ ...patch, page: '0' }); };
  const goToPage = (next: number) => { setLoading(true); setValues({ page: String(next) }); };
  return <section className="space-y-6">
    <div className="empty:hidden"><BackButton /></div>
    <div className="surface-card flex flex-wrap items-center justify-between gap-4">
      <div><h1 className="text-2xl font-bold">Intervenciones</h1><p className="text-neutral-500">Actividades y avances por ubicación</p></div>
      {['ADMIN','COORDINADOR'].includes(user?.role.code ?? '') && <Link className="rounded-md bg-brand-600 px-4 py-3 text-white" href="/intervenciones/nueva">Nueva intervención</Link>}
    </div>
    {greenElementCode !== undefined && <p className="rounded-md border border-neutral-200 p-3">Ejemplar: <strong>{greenElementCode}</strong> · <Link href="/intervenciones" className="text-brand-600 underline">Ver todas las intervenciones</Link></p>}
    <div className="grid gap-4 rounded-lg border border-neutral-200 bg-neutral-0 p-4 sm:grid-cols-3">
      <Select id="intervention-status" label="Estado" value={status} onChange={o => change({ status: o?.code ?? '' })}
        options={statuses.items.map((s,i) => ({ id:i, code:s.code, label:s.label }))} placeholder="Todos los estados" clearable />
      <label className="grid gap-1 text-sm">Desde<input className="h-11 rounded-md border border-neutral-200 p-2" type="date" value={from} onChange={e => change({ from: e.target.value })} /></label>
      <label className="grid gap-1 text-sm">Hasta<input className="h-11 rounded-md border border-neutral-200 p-2" type="date" value={to} onChange={e => change({ to: e.target.value })} /></label>
    </div>
    {error && <div role="alert" className="rounded-lg border border-action-danger p-4"><p>{error}</p><Button onClick={reload}>Reintentar</Button></div>}
    {loading ? <LoadingSkeleton variant="card" /> : !error && result?.content.length === 0 ? <EmptyState title="No hay intervenciones" description="Prueba con otras fechas o estados." /> : !error && <>
      <p className="surface-pill text-sm text-neutral-500">{result?.page.totalElements} actividades</p>
      <div className="grid gap-4 lg:grid-cols-2">{result?.content.map(work => <article key={work.id} className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-0 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2"><Link href={`/intervenciones/${work.id}`} className="font-semibold text-brand-600 underline">{work.code}</Link>
          <StatusBadge code={work.statusCode} label={statuses.items.find(s => s.code === work.statusCode)?.label ?? work.statusCode} /></div>
        <p>Programada: {work.scheduledDate}</p><p>{work.completedLocationCount}/{work.locationCount} ubicaciones terminadas · {work.validatedLocationCount} aprobadas</p>
        {work.pendingEvidenceCount > 0 && <p className="text-sm">Fotos pendientes: {work.pendingEvidenceCount}</p>}
        {work.approvedForCounting && <p className="text-sm text-brand-600">Aprobación final recibida</p>}
      </article>)}</div>
      <nav aria-label="Páginas de intervenciones" className="surface-card flex items-center justify-between gap-3">
        <Button variant="secondary" disabled={page === 0} onClick={() => goToPage(page - 1)}>Anterior</Button>
        <span>Página {page + 1} de {Math.max(1, result?.page.totalPages ?? 0)}</span>
        <Button variant="secondary" disabled={page + 1 >= (result?.page.totalPages ?? 0)} onClick={() => goToPage(page + 1)}>Siguiente</Button>
      </nav>
    </>}
  </section>;
}
