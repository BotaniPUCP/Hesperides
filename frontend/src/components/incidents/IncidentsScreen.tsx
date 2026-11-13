'use client';

import Link from 'next/link';
import { useState } from 'react';
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
import { IncidentIcon, IncidentPanel, IncidentStat } from './IncidentPresentation';

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
  const [allAttention, setAllAttention] = useState(false);
  const preview = filters.view !== 'reports' && filters.page === 0 && !filters.search && !filters.status
    && !filters.registration && !filters.severity && !filters.urgency && !filters.service && !filters.zoneId;
  const metrics: [string, number][] = summary.data ? [
    ['Pendientes de registro', summary.data.pendingApproval], ['Pendientes de atención', summary.data.pendingAttention],
    ['En atención', summary.data.inProgress], ['Resueltas', summary.data.resolved], ['Intervenciones finalizadas', summary.data.completedInterventions],
    ['Reportes por corregir', summary.data.pendingCorrection], ['Resoluciones observadas', summary.data.resolutionObserved],
    ['Intervenciones validadas', summary.data.validatedInterventions],
    ...(dashboard ? [['Urgencia alta activas', dashboard.highUrgency], ['Registradas sin trabajo relacionado', dashboard.withoutWork], ['Pendientes de revisión final de cierre', dashboard.readyForClosure]] as [string, number][] : []),
  ] : [];

  return (
    <IncidentWorkspace>
      <PageHeader title={showDashboard ? 'Resumen de incidencias' : 'Incidencias'} description={coordinator ? 'Lo que requiere atención y cómo avanza el trabajo.' : 'Tus reportes y el trabajo de tu cuadrilla, en un solo lugar.'} actions={<Link href={href('/incidencias/nueva')} className="inline-flex min-h-12 items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-forest-700 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2">
          <IncidentIcon name="plus" />
          Informar una incidencia
        </Link>} />
      {coordinator && <nav aria-label="Vistas de incidencias" className="flex gap-6 border-b border-neutral-200">
        <button type="button" aria-current={showDashboard ? 'page' : undefined} className={`border-b-2 px-1 pb-2 text-xs font-semibold ${showDashboard ? 'border-brand-700 text-brand-800' : 'border-transparent text-neutral-600'}`} onClick={() => changeFilters(current => ({...current,view:undefined,page:0}))}>Tablero</button>
        <button type="button" aria-current={!showDashboard ? 'page' : undefined} className={`border-b-2 px-1 pb-2 text-xs font-semibold ${!showDashboard ? 'border-brand-700 text-brand-800' : 'border-transparent text-neutral-600'}`} onClick={() => changeFilters(current => ({...current,view:'reports',page:0}))}>Reportes</button>
      </nav>}
      {!coordinator && <IncidentMyReports />}

      {showDashboard && <section aria-label="Tablero de incidencias" className="space-y-5">
        {dashboard && <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <IncidentStat label="Reportes recibidos" value={dashboard.total} caption="Todos los reportes recibidos" tone="primary" icon="report" />
            <IncidentStat label="Por registrar" value={dashboard.pendingRegistration} caption="Pendientes de revisión" tone="amber" icon="clock" />
            <IncidentStat label="Registradas abiertas" value={Math.max(0,dashboard.active-dashboard.pendingRegistration)} caption="Con atención en seguimiento" tone="blue" icon="work" />
            <IncidentStat label="Cerradas" value={summary.data?.resolved ?? 0} caption="Resolución validada" tone="green" icon="check" />
          </div>
          <IncidentPanel title="Requieren tu atención" aside={dashboard.attention.length > 3 ? <button type="button" aria-expanded={allAttention} onClick={() => setAllAttention(v => !v)} className="flex items-center gap-2 text-[11px] font-medium text-brand-800">{allAttention ? 'Mostrar menos' : `Ver los ${dashboard.attention.length} pendientes`}<IncidentIcon name="arrow" /></button> : <span className="text-[11px] text-neutral-600">{dashboard.attention.length} casos</span>}>
            {!dashboard.attention.length ? <p className="p-5 text-xs">Sin reportes que requieran atención prioritaria.</p> : <ul>{dashboard.attention.slice(0, allAttention ? undefined : 3).map(i => <li key={i.id}>
              <Link href={href(`/incidencias/${i.id}`)} className="grid grid-cols-[66px_minmax(0,1fr)_14px] items-center gap-x-3 gap-y-1 border-b border-neutral-100 px-5 py-3 hover:bg-neutral-50 sm:grid-cols-[75px_minmax(0,1fr)_150px_14px]">
                <span className="col-start-1 row-start-1 text-[10px] font-semibold text-neutral-600">{i.officialCode ?? `#${i.id}`}</span><span className="col-start-2 row-start-1 min-w-0 truncate text-xs font-medium" title={i.description}>{i.description}</span>
                <span className="col-start-2 row-start-2 whitespace-nowrap text-[10px] text-urgency-medium-fg sm:col-start-3 sm:row-start-1">{!i.approvedAt ? 'Por registrar' : i.status.label}</span><span className="col-start-3 row-start-1 text-neutral-500 sm:col-start-4"><IncidentIcon name="arrow" /></span>
              </Link>
            </li>)}</ul>}
          </IncidentPanel>
        </>}
        {summary.loading ? <LoadingSkeleton variant="card" /> : summary.errorMessage ? (
          <div role="alert" className="space-y-3 rounded-lg bg-alert-warning-bg p-4 text-alert-warning-fg">
            <p>No se pudo cargar el resumen. {summary.errorMessage}</p>
            <Button variant="secondary" size="lg" onClick={summary.reload}>Reintentar resumen</Button>
          </div>
        ) : null}
        {summary.data?.matrix && <IncidentDashboard matrix={summary.data.matrix} progress={dashboard ? [
          {label:'Por registrar',count:dashboard.pendingRegistration}, {label:'Registradas abiertas',count:Math.max(0,dashboard.active-dashboard.pendingRegistration)}, {label:'Cerradas',count:summary.data.resolved},
        ] : undefined}><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{metrics.map(([label, count]) => <Card key={label}><p className="text-xs text-neutral-600">{label}</p><p className="mt-2 text-2xl font-semibold tabular-nums">{count}</p></Card>)}</div></IncidentDashboard>}
        {dashboard && <p className="text-[10px] text-neutral-600">Totales generales, independientes de los filtros. Gráficos de todos los reportes, incluidos pendientes y cerrados. Actualizado: {new Date(dashboard.generatedAt).toLocaleString('es-PE')}.</p>}
      </section>}

      <section className="overflow-hidden rounded-xl border border-neutral-200 bg-neutral-0" aria-label="Listado de reportes">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-5 py-3"><h2 className="text-[13px] font-semibold">{preview ? coordinator ? 'Reportes recientes' : 'Reportes recientes de mi cuadrilla' : coordinator ? 'Reportes' : 'Reportes propios y de mi cuadrilla'}</h2>
        <div className="flex items-center gap-3">{preview && <button type="button" className="text-[11px] font-medium text-brand-800" onClick={() => changeFilters(current => ({...current,view:'reports',page:0}))}>Ver todos</button>}{coordinator && <IncidentExportButton />}</div></div>
      <details open={!preview} className="border-b border-neutral-100 px-5 py-3">
        <summary className="cursor-pointer text-[11px] font-medium text-brand-800">Buscar y filtrar reportes</summary>
      <div className="pt-3">
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
        {coordinator && <details className="mt-2" open={Boolean(filters.registration || filters.severity || filters.urgency || filters.service)}><summary className="cursor-pointer py-2 text-[11px] font-medium text-brand-800">Más filtros</summary><div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Select id="incident-registration" label="Registro oficial" size="lg" clearable value={filters.registration ?? null}
            options={[{id:1,code:'PENDING',label:'Pendientes de registro'},{id:2,code:'REGISTERED',label:'Registradas en curso'},{id:3,code:'CLOSED',label:'Cerradas'}]}
            onChange={v => changeFilters(current => ({...current,registration:v?.code,page:0}))} />
          <Select id="incident-severity" label="Severidad" size="lg" clearable value={filters.severity ?? null} options={options.data?.matrix.severities ?? []}
            onChange={v => changeFilters(current => ({...current,severity:v?.code,page:0}))} />
          <Select id="incident-urgency" label="Urgencia" size="lg" clearable value={filters.urgency ?? null} options={options.data?.urgencies ?? []}
            onChange={v => changeFilters(current => ({...current,urgency:v?.code,page:0}))} />
          <Select id="incident-service" label="Servicio" size="lg" clearable value={filters.service ?? null} options={options.data?.matrix.services ?? []}
            onChange={v => changeFilters(current => ({...current,service:v?.code,page:0}))} />
        </div></details>}
        {options.errorMessage && <div role="alert" className="mt-3 space-y-3 rounded-md bg-alert-warning-bg p-3 text-sm text-alert-warning-fg">
          <p>No se pudieron cargar los filtros de estado. {options.errorMessage}</p>
          <Button variant="secondary" size="lg" onClick={options.reload}>Reintentar opciones</Button>
        </div>}
      </div>
      </details>

      {list.loading ? <LoadingSkeleton variant="card" count={3} /> : list.errorMessage ? (
        <div role="alert" className="space-y-3 rounded-lg bg-alert-danger-bg p-4 text-alert-danger-fg">
          <p>{list.errorMessage}</p><Button size="lg" variant="secondary" onClick={list.reload}>Reintentar</Button>
        </div>
      ) : list.data && <>
        {list.data.content.length === 0 ? (
          <EmptyState title={filters.search || filters.status ? 'No hay incidencias con esos criterios' : 'Todavía no hay incidencias'}
            description={filters.search || filters.status ? 'Prueba con otra descripción o cambia los filtros.' : 'Informa lo que ocurrió con un texto breve; las fotos y la ubicación son opcionales.'} />
        ) : <IncidentReportTable incidents={preview ? list.data.content.slice(0,3) : list.data.content} href={href} />}
        {!preview && <nav aria-label="Páginas de incidencias" className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 px-5 py-3">
          <Button variant="secondary" size="lg" disabled={filters.page === 0} onClick={() => changeFilters(current => ({ ...current, page: Math.max(0,current.page - 1) }))}>Anterior</Button>
          <p className="text-sm text-neutral-700">{list.data.page.totalElements} registros · Página {filters.page + 1} de {Math.max(1, list.data.page.totalPages)}</p>
          <Button variant="secondary" size="lg" disabled={filters.page + 1 >= list.data.page.totalPages} onClick={() => changeFilters(current => ({ ...current, page: current.page + 1 }))}>Siguiente</Button>
        </nav>}
      </>}
      </section>
    </IncidentWorkspace>
  );
}
