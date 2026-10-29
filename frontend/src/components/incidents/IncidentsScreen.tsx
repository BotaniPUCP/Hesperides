'use client';

import Link from 'next/link';
import { Button, Card, EmptyState, Input, LoadingSkeleton, Select, StatusBadge, UrgencyBadge, type UrgencyCode } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useIncidentNavigation, useIncidentOptions, useIncidents, useIncidentSummary } from '@/hooks/useIncidents';
import { incidentDate } from '@/lib/incidentNavigation';

export function IncidentsScreen() {
  const { user } = useAuth();
  const coordinator = user?.role.code === 'COORDINADOR';
  const { filters, href, changeFilters } = useIncidentNavigation();
  const debouncedSearch = useDebouncedValue(filters.search, 300);
  const list = useIncidents({ ...filters, search: debouncedSearch });
  const options = useIncidentOptions();
  const summary = useIncidentSummary();
  const refresh = () => { list.reload(); options.reload(); summary.reload(); };
  const metrics: [string, number][] = summary.data ? [
    ['Pendientes de aprobación', summary.data.pendingApproval], ['Pendientes de atención', summary.data.pendingAttention],
    ['En atención', summary.data.inProgress], ['Resueltas', summary.data.resolved], ['Intervenciones realizadas', summary.data.completedInterventions],
  ] : [];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900">Incidencias</h1>
          <p className="mt-1 text-sm text-neutral-700">{coordinator ? 'Revisión y seguimiento de la atención.' : 'Tus envíos y las incidencias de tu cuadrilla.'}</p>
        </div>
        <Link href={href('/incidencias/nueva')} className="inline-flex min-h-12 items-center rounded-md bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-forest-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2">
          Informar una incidencia
        </Link>
      </header>

      {coordinator && <section aria-label="Tablero de incidencias" className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900">Resumen de atención</h2>
        <p className="text-sm text-neutral-700">Incidencias y sus intervenciones vinculadas. Totales generales, independientes de los filtros de la lista.</p>
        {summary.loading ? <LoadingSkeleton variant="card" /> : summary.errorMessage ? (
          <div role="alert" className="space-y-3 rounded-lg bg-alert-warning-bg p-4 text-alert-warning-fg">
            <p>No se pudo cargar el resumen. {summary.errorMessage}</p>
            <Button variant="secondary" size="lg" onClick={summary.reload}>Reintentar resumen</Button>
          </div>
        ) : <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">{metrics.map(([label, count]) => (
          <Card key={label}><p className="text-sm text-neutral-700">{label}</p><p className="mt-2 text-3xl font-semibold text-neutral-900">{count}</p></Card>
        ))}</div>}
      </section>}

      <Card>
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="min-w-0 flex-1">
            <Input id="incident-search" label="Buscar" type="search" size="lg" value={filters.search} maxLength={200}
              onChange={(search) => changeFilters({ ...filters, search, page: 0 })} placeholder="Descripción o referencia del lugar" />
          </div>
          <div className="md:w-64">
            <Select id="incident-status" label="Estado" size="lg" value={filters.status || null}
              options={options.data?.statuses ?? []} loading={options.loading} disabled={Boolean(options.errorMessage)} clearable placeholder="Todos"
              onChange={(selected) => changeFilters({ ...filters, status: selected?.code ?? '', page: 0 })} />
          </div>
          <Button variant="secondary" size="lg" disabled={list.loading} onClick={refresh}>Actualizar</Button>
        </div>
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
        ) : <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">{list.data.content.map((incident) => (
          <li key={incident.id}>
            <Link href={href(`/incidencias/${incident.id}`)} className="block h-full rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2">
              <Card className="h-full transition-shadow hover:shadow-lg">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm text-neutral-700">#{incident.id}</span>
                  <StatusBadge code={incident.status.code} label={incident.status.label} />
                </div>
                <p className="mt-3 line-clamp-3 break-words font-medium text-neutral-900">{incident.description}</p>
                <p className="mt-3 text-sm text-neutral-700">{incident.reportedBy.fullName} · {incidentDate(incident.createdAt)}</p>
                <p className="mt-1 text-sm text-neutral-700">{incident.team?.name ?? 'Sin cuadrilla asignada'}</p>
                <div className="mt-3">{incident.urgency ? <UrgencyBadge code={incident.urgency.code as UrgencyCode} label={incident.urgency.label} /> : <span className="text-sm text-neutral-700">Urgencia sin evaluar</span>}</div>
              </Card>
            </Link>
          </li>
        ))}</ul>}
        <nav aria-label="Páginas de incidencias" className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="secondary" size="lg" disabled={filters.page === 0} onClick={() => changeFilters({ ...filters, page: filters.page - 1 })}>Anterior</Button>
          <p className="text-sm text-neutral-700">{list.data.page.totalElements} registros · Página {filters.page + 1} de {Math.max(1, list.data.page.totalPages)}</p>
          <Button variant="secondary" size="lg" disabled={filters.page + 1 >= list.data.page.totalPages} onClick={() => changeFilters({ ...filters, page: filters.page + 1 })}>Siguiente</Button>
        </nav>
      </>}
    </div>
  );
}
