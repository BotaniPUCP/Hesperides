'use client';

import Link from 'next/link';
import { Button, Card, EmptyState, Input, LoadingSkeleton, Select } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useIncidentNavigation, useIncidentOptions, useIncidents, useIncidentSummary } from '@/hooks/useIncidents';
import { useListScrollRestoration } from '@/hooks/useListScrollRestoration';
import { incidentQuery } from '@/lib/incidentNavigation';
import { IncidentDashboard, IncidentExportButton } from './IncidentDashboard';
import { PageHeader } from '@/components/layouts/PageHeader';
import { IncidentReportTable } from './IncidentReportTable';
import { IncidentMyReports } from './IncidentMyReports';
import { IncidentWorkspace } from './IncidentWorkspace';

export function IncidentsScreen() {
  const { user } = useAuth();
  const coordinator = user?.role.code === 'COORDINADOR';
  const { filters, href, changeFilters } = useIncidentNavigation();
  const debouncedSearch = useDebouncedValue(filters.search, 300);
  const list = useIncidents({ ...filters, search: debouncedSearch });
  useListScrollRestoration('/incidencias', incidentQuery(filters), !list.loading);
  const options = useIncidentOptions();
  const summary = useIncidentSummary();
  const refresh = () => { list.reload(); options.reload(); summary.reload(); };
  const showDashboard=coordinator && filters.view!=='reports';
  const dashboard=summary.data?.dashboard;
  const metrics: [string, number][] = summary.data ? [
    ['Pendientes de registro', summary.data.pendingApproval], ['Pendientes de atención', summary.data.pendingAttention],
    ['En atención', summary.data.inProgress], ['Resueltas', summary.data.resolved], ['Intervenciones finalizadas', summary.data.completedInterventions],
    ['Reportes por corregir', summary.data.pendingCorrection], ['Resoluciones observadas', summary.data.resolutionObserved],
    ['Intervenciones validadas', summary.data.validatedInterventions],
    ...(dashboard ? [['Urgencia alta activas', dashboard.highUrgency], ['Registradas sin trabajo relacionado', dashboard.withoutWork], ['Pendientes de revisión final de cierre', dashboard.readyForClosure]] as [string, number][] : []),
  ] : [];

  return (
    <IncidentWorkspace>
      <PageHeader title="Incidencias" description={coordinator ? 'Revisión y seguimiento de la atención.' : 'Tus envíos y las incidencias de tu cuadrilla.'} actions={<Link href={href('/incidencias/nueva')} className="inline-flex min-h-12 items-center rounded-md bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-forest-700 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2">
          Informar una incidencia
        </Link>} />
      {coordinator && <nav aria-label="Vistas de incidencias" className="flex flex-wrap gap-3">
        <Button size="lg" variant={showDashboard ? 'primary' : 'secondary'} onClick={() => changeFilters(current => ({...current,view:undefined,page:0}))}>Tablero</Button>
        <Button size="lg" variant={!showDashboard ? 'primary' : 'secondary'} onClick={() => changeFilters(current => ({...current,view:'reports',page:0}))}>Reportes</Button>
      </nav>}
      {!coordinator && <IncidentMyReports />}

      {showDashboard && <section aria-label="Tablero de incidencias" className="space-y-5">
        <p className="text-sm text-neutral-700">Totales generales, independientes de los filtros de la lista.</p>
        {dashboard && <>
          <p className="text-xs text-neutral-700">Actualizado: {new Date(dashboard.generatedAt).toLocaleString('es-PE')}</p>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[
            ['Reportes recibidos',dashboard.total],['Por registrar',dashboard.pendingRegistration],
            ['Registradas abiertas',Math.max(0,dashboard.active-dashboard.pendingRegistration)],['Cerradas',summary.data?.resolved ?? 0],
          ].map(([label,count], index) => <div key={label} className={`rounded-xl border p-5 ${index === 0 ? 'border-forest-800 bg-forest-800 text-white' : 'border-neutral-200 bg-neutral-0 text-neutral-900'}`}><p className={`text-sm ${index === 0 ? 'text-white' : 'text-neutral-700'}`}>{label}</p><p className="mt-3 text-4xl font-semibold tabular-nums">{count}</p></div>)}</div>
          <Card title="Requieren atención">
            <p className="mb-3 text-sm text-neutral-700">Reportes por registrar, urgencia alta, observaciones o asignaciones pendientes. No son alertas de SLA.</p>
            {!dashboard.attention.length ? <p className="text-sm">Sin reportes que requieran atención prioritaria.</p> : <ul className="divide-y divide-neutral-200">{dashboard.attention.slice(0, 3).map(i => <li key={i.id} className="py-3">
              <Link href={href(`/incidencias/${i.id}`)} className="block truncate text-sm font-medium text-brand-800 hover:underline">{i.officialCode ?? `Reporte #${i.id}`} · {i.description}</Link>
              <p className="mt-1 text-sm text-neutral-700">{i.status.label} · {i.matrix.responsible?.fullName ?? 'Responsable sin asignar'}{!i.approvedAt ? ' · Pendiente de registro oficial' : ''}{i.urgency?.code==='HIGH' ? ' · Urgencia alta' : ''}</p>
            </li>)}</ul>}
            {dashboard.attention.length > 3 && <details className="mt-3 border-t border-neutral-200 pt-2"><summary className="min-h-12 cursor-pointer py-3 text-sm font-medium text-brand-800">Ver {dashboard.attention.length - 3} casos más</summary>
              <ul className="divide-y divide-neutral-200">{dashboard.attention.slice(3).map(i => <li key={i.id} className="py-3"><Link href={href(`/incidencias/${i.id}`)} className="text-sm font-medium text-brand-800 hover:underline">{i.officialCode ?? `Reporte #${i.id}`} · {i.description}</Link><p className="text-sm text-neutral-700">{i.status.label}</p></li>)}</ul></details>}
          </Card>
        </>}
        {summary.loading ? <LoadingSkeleton variant="card" /> : summary.errorMessage ? (
          <div role="alert" className="space-y-3 rounded-lg bg-alert-warning-bg p-4 text-alert-warning-fg">
            <p>No se pudo cargar el resumen. {summary.errorMessage}</p>
            <Button variant="secondary" size="lg" onClick={summary.reload}>Reintentar resumen</Button>
          </div>
        ) : <details><summary className="min-h-12 cursor-pointer py-3 text-sm font-semibold text-brand-800">Seguimiento del flujo y trabajo relacionado</summary><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{metrics.map(([label, count]) => (
          <Card key={label}><p className="text-sm text-neutral-700">{label}</p><p className="mt-2 text-3xl font-semibold text-neutral-900">{count}</p></Card>
        ))}</div></details>}
        {summary.data?.matrix && <IncidentDashboard matrix={summary.data.matrix} />}
      </section>}

      <div className="flex flex-wrap items-start justify-between gap-3"><h2 className="text-lg font-semibold">{coordinator ? 'Resumen de reportes' : 'Reportes propios y de mi cuadrilla'}</h2>
        {coordinator && <IncidentExportButton />}</div>
      <Card>
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="min-w-0 flex-1">
            <Input id="incident-search" label="Buscar" type="search" size="lg" value={filters.search} maxLength={200}
              onChange={(search) => changeFilters(current => ({ ...current, search, page: 0 }))} placeholder="Número OSG, descripción o referencia" />
          </div>
          <div className="md:w-64">
            <Select id="incident-status" label="Estado" size="lg" value={filters.status || null}
              options={options.data?.statuses ?? []} loading={options.loading} disabled={Boolean(options.errorMessage)} clearable placeholder="Todos"
              onChange={(selected) => changeFilters(current => ({ ...current, status: selected?.code ?? '', page: 0 }))} />
          </div>
          <Button variant="secondary" size="lg" disabled={list.loading} onClick={refresh}>Actualizar</Button>
        </div>
        {coordinator && <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Select id="incident-registration" label="Registro oficial" size="lg" clearable value={filters.registration ?? null}
            options={[{id:1,code:'PENDING',label:'Pendientes de registro'},{id:2,code:'REGISTERED',label:'Registradas en curso'},{id:3,code:'CLOSED',label:'Cerradas'}]}
            onChange={v => changeFilters(current => ({...current,registration:v?.code,page:0}))} />
          <Select id="incident-severity" label="Severidad" size="lg" clearable value={filters.severity ?? null} options={options.data?.matrix.severities ?? []}
            onChange={v => changeFilters(current => ({...current,severity:v?.code,page:0}))} />
          <Select id="incident-urgency" label="Urgencia" size="lg" clearable value={filters.urgency ?? null} options={options.data?.urgencies ?? []}
            onChange={v => changeFilters(current => ({...current,urgency:v?.code,page:0}))} />
          <Select id="incident-service" label="Servicio" size="lg" clearable value={filters.service ?? null} options={options.data?.matrix.services ?? []}
            onChange={v => changeFilters(current => ({...current,service:v?.code,page:0}))} />
        </div>}
        {options.errorMessage && <div role="alert" className="mt-3 space-y-3 rounded-md bg-alert-warning-bg p-3 text-sm text-alert-warning-fg">
          <p>No se pudieron cargar los filtros de estado. {options.errorMessage}</p>
          <Button variant="secondary" size="lg" onClick={options.reload}>Reintentar opciones</Button>
        </div>}
      </Card>

      {list.loading ? <LoadingSkeleton variant="card" count={3} /> : list.errorMessage ? (
        <div role="alert" className="space-y-3 rounded-lg bg-alert-danger-bg p-4 text-alert-danger-fg">
          <p>{list.errorMessage}</p><Button size="lg" variant="secondary" onClick={list.reload}>Reintentar</Button>
        </div>
      ) : list.data && <>
        {list.data.content.length === 0 ? (
          <EmptyState title={filters.search || filters.status ? 'No hay incidencias con esos criterios' : 'Todavía no hay incidencias'}
            description={filters.search || filters.status ? 'Prueba con otra descripción o cambia los filtros.' : 'Informa lo que ocurrió con un texto breve; las fotos y la ubicación son opcionales.'} />
        ) : <IncidentReportTable incidents={list.data.content} href={href} />}
        <nav aria-label="Páginas de incidencias" className="surface-card flex flex-wrap items-center justify-between gap-3">
          <Button variant="secondary" size="lg" disabled={filters.page === 0} onClick={() => changeFilters(current => ({ ...current, page: Math.max(0,current.page - 1) }))}>Anterior</Button>
          <p className="text-sm text-neutral-700">{list.data.page.totalElements} registros · Página {filters.page + 1} de {Math.max(1, list.data.page.totalPages)}</p>
          <Button variant="secondary" size="lg" disabled={filters.page + 1 >= list.data.page.totalPages} onClick={() => changeFilters(current => ({ ...current, page: current.page + 1 }))}>Siguiente</Button>
        </nav>
      </>}
    </IncidentWorkspace>
  );
}
