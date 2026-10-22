'use client';

import { useEffect, useState } from 'react';
import type { Incident, IncidentDetail, IncidentOptions, IncidentSummary, Page } from '@shared/types';
import { Button, Card, EmptyState, StatusBadge } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { incidentsApi } from '@/lib/incidents-api';
import { mensajeDeApiError } from '@/lib/api-errors';
import { IncidentCaptureForm } from './IncidentCaptureForm';
import { IncidentDetailPanel, incidentDate } from './IncidentDetailPanel';

export function IncidentsScreen() {
  const { user } = useAuth();
  if (!user || !['COORDINADOR', 'SUPERVISOR'].includes(user.role.code)) {
    return <EmptyState title="Sin acceso a incidencias" description="Este módulo está disponible para capataces y coordinación." />;
  }
  return <IncidentWorkspace sender={user.fullName} coordinator={user.role.code === 'COORDINADOR'} />;
}

function IncidentWorkspace({ sender, coordinator }: { sender: string; coordinator: boolean }) {
  const [view, setView] = useState<'list' | 'capture' | number>('list');
  const [options, setOptions] = useState<IncidentOptions | null>(null);
  const [detail, setDetail] = useState<IncidentDetail | null>(null);
  const [data, setData] = useState<Page<Incident> | null>(null);
  const [summary, setSummary] = useState<IncidentSummary | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const [loadError, setError] = useState('');
  const [loadedQuery, setLoadedQuery] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const query = JSON.stringify([view, page, status, debouncedSearch, coordinator, revision]);
  const loading = loadedQuery !== query;
  const error = loading ? '' : loadError;

  useEffect(() => {
    if (view === 'capture') return;
    let active = true;
    const load = async () => {
      const nextOptions = await incidentsApi.options();
      if (!active) return;
      setOptions(nextOptions);
      if (typeof view === 'number') {
        const next = await incidentsApi.detail(view);
        if (active) setDetail(next);
      } else {
        const [next, totals] = await Promise.all([incidentsApi.list(page, status, debouncedSearch), coordinator ? incidentsApi.summary() : Promise.resolve(null)]);
        if (active) { setData(next); setSummary(totals); }
      }
    };
    void load().then(() => { if (active) setError(''); })
      .catch((ex) => { if (active) setError(mensajeDeApiError(ex)); })
      .finally(() => { if (active) setLoadedQuery(query); });
    return () => { active = false; };
  }, [view, page, status, debouncedSearch, coordinator, query]);

  if (view === 'capture') return <div className="mx-auto max-w-2xl"><IncidentCaptureForm sender={sender}
    onCancel={() => setView('list')} onDone={(id) => { setDetail(null); setView(id); }} /></div>;

  if (typeof view === 'number') return <>
    {loading && <p role="status" className="py-4 text-neutral-500">Cargando detalle…</p>}
    {error && <div role="alert" className="space-y-3"><p>{error}</p><Button size="lg" onClick={() => setRevision((r) => r + 1)}>Reintentar</Button><Button size="lg" variant="ghost" onClick={() => setView('list')}>Volver</Button></div>}
    {!loading && !error && detail && options && <IncidentDetailPanel key={view} detail={detail} options={options} coordinator={coordinator}
      onChange={setDetail} onBack={() => setView('list')} onReload={() => setRevision((r) => r + 1)} />}
  </>;

  const metrics: [string, number][] = summary ? [
    ['Pendientes de aprobación', summary.pendingApproval], ['Pendientes de atención', summary.pendingAttention],
    ['En atención', summary.inProgress], ['Resueltas', summary.resolved], ['Intervenciones realizadas', summary.completedInterventions],
  ] : [];
  return <div className="space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Incidencias</h1>
        <p className="text-sm text-neutral-500">{coordinator ? 'Revisión y seguimiento de la atención.' : 'Tus envíos y las incidencias de tu cuadrilla.'}</p>
      </div>
      <Button size="lg" onClick={() => setView('capture')}>Informar una incidencia</Button>
    </header>
    {coordinator && <section aria-label="Tablero de incidencias" className="space-y-3">
      <h2 className="text-lg font-semibold">Resumen de atención</h2>
      <p className="text-sm text-neutral-500">Incidencias y sus intervenciones vinculadas. Totales generales, independientes de los filtros de la lista.</p>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">{metrics.map(([label, count]) => <Card key={label}><p className="text-sm text-neutral-500">{label}</p><p className="mt-2 text-3xl font-semibold text-neutral-900">{count}</p></Card>)}</div>
    </section>}
    <div className="flex flex-wrap items-end gap-3">
      <label className="w-full min-w-0 flex-none text-sm font-medium sm:w-auto sm:flex-1">Buscar
        <input value={search} maxLength={200} onChange={(e) => { setSearch(e.target.value); setPage(0); }} placeholder="Descripción o referencia del lugar"
          className="mt-1 min-h-12 w-full rounded-md border border-neutral-200 px-3 text-base" />
      </label>
      <label className="text-sm font-medium">Estado
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} className="mt-1 block min-h-12 max-w-full rounded-md border border-neutral-200 px-3 text-base">
          <option value="">Todos</option>{options?.statuses.map((s) => <option key={s.code} value={s.code}>{s.label}</option>)}
        </select>
      </label>
      <Button variant="secondary" size="lg" disabled={loading} onClick={() => setRevision((r) => r + 1)}>Actualizar</Button>
    </div>
    {loading && <p role="status" className="text-sm text-neutral-500">Cargando incidencias…</p>}
    {error && <div role="alert" className="space-y-3"><p className="text-action-danger">{error}</p><Button size="lg" variant="secondary" onClick={() => setRevision((r) => r + 1)}>Reintentar</Button></div>}
    {!error && data && <>
      {data.content.length === 0 ? <EmptyState title="No hay incidencias para mostrar" description="Puedes informar una incidencia o cambiar los filtros." /> :
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">{data.content.map((incident) => <li key={incident.id}>
          <button className="h-full w-full rounded-lg border border-neutral-200 bg-neutral-0 p-4 text-left shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
            onClick={() => { setDetail(null); setView(incident.id); }}>
            <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm text-neutral-500">#{incident.id}</span><StatusBadge code={incident.status.code} label={incident.status.label} /></div>
            <p className="mt-3 line-clamp-3 break-words font-medium text-neutral-900">{incident.description}</p>
            <p className="mt-3 text-sm text-neutral-500">{incident.reportedBy.fullName} · {incidentDate(incident.createdAt)}</p>
            <p className="mt-1 text-sm text-neutral-500">{incident.team?.name ?? 'Sin cuadrilla asignada'}</p>
          </button>
        </li>)}</ul>}
      <nav aria-label="Páginas de incidencias" className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="secondary" size="lg" disabled={loading || page === 0} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
        <p className="text-sm text-neutral-500">{data.page.totalElements} registros · Página {page + 1} de {Math.max(1, data.page.totalPages)}</p>
        <Button variant="secondary" size="lg" disabled={loading || page + 1 >= data.page.totalPages} onClick={() => setPage((p) => p + 1)}>Siguiente</Button>
      </nav>
    </>}
  </div>;
}
