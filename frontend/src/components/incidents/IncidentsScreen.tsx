'use client';

import Link from 'next/link';
import { Button, Card, EmptyState, Input, LoadingSkeleton, Select } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useIncidentMine, useIncidentNavigation, useIncidentOptions, useIncidents } from '@/hooks/useIncidents';
import { useListScrollRestoration } from '@/hooks/useListScrollRestoration';
import { incidentDate, incidentQuery } from '@/lib/incidentNavigation';
import { managesIncidents } from '@/lib/incidentRoles';
import { PageHeader } from '@/components/layouts/PageHeader';
import { IncidentBadges } from './IncidentBadges';
import { IncidentMineSummary } from './IncidentMineSummary';

export function IncidentsScreen() {
  const { user } = useAuth();
  const coordinator = managesIncidents(user?.role.code);
  const { filters, href, changeFilters } = useIncidentNavigation();
  const debouncedSearch = useDebouncedValue(filters.search, 300);
  const list = useIncidents({ ...filters, search: debouncedSearch });
  useListScrollRestoration('/incidencias', incidentQuery(filters), !list.loading);
  const options = useIncidentOptions();
  const mine = useIncidentMine();
  const filtered = Boolean(filters.search || filters.status);

  return (
    <div className="space-y-6">
      <PageHeader title="Incidencias"
        description={coordinator ? 'Revisa, activa y sigue la atención hasta cerrarla.' : 'Tus reportes y las incidencias que te tocan.'}
        actions={<Link href={href('/incidencias/nueva')} className="inline-flex min-h-12 items-center rounded-md bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-forest-700 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2">
          Informar una incidencia
        </Link>} />

      {!coordinator && <IncidentMineSummary mine={mine.data} loading={mine.loading} error={mine.errorMessage}
        onRetry={mine.reload} href={href} />}

      <Card>
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="min-w-0 flex-1">
            <Input id="incident-search" label="Buscar" type="search" size="lg" value={filters.search} maxLength={200}
              onChange={(search) => changeFilters({ ...filters, search, page: 0 })} placeholder="Código, título, descripción o referencia" />
          </div>
          <div className="md:w-64">
            <Select id="incident-status" label="Estado" size="lg" value={filters.status || null}
              options={options.data?.statuses ?? []} loading={options.loading} disabled={Boolean(options.errorMessage)} clearable placeholder="Todos"
              onChange={(selected) => changeFilters({ ...filters, status: selected?.code ?? '', page: 0 })} />
          </div>
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
          <EmptyState title={filtered ? 'No hay incidencias con esos criterios' : 'Todavía no hay incidencias'}
            description={filtered ? 'Prueba con otro texto o cambia el estado.' : 'Cuéntalo con tus palabras y marca qué tan grave es; lo demás es opcional.'} />
        ) : <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">{list.data.content.map((incident) => (
          <li key={incident.id}>
            <Link href={href(`/incidencias/${incident.id}`)} className="block h-full rounded-lg focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2">
              <Card className="h-full space-y-3 transition-shadow hover:shadow-lg">
                <p className="text-sm font-medium text-neutral-700">{incident.code}</p>
                {incident.title && <p className="font-semibold text-neutral-900">{incident.title}</p>}
                <p className="line-clamp-3 break-words text-neutral-900">{incident.description}</p>
                <IncidentBadges incident={incident} />
                <p className="text-sm text-neutral-700">{incident.reportedBy.fullName} · {incidentDate(incident.createdAt)}
                  {incident.zone ? ` · ${incident.zone.name}` : ''}</p>
              </Card>
            </Link>
          </li>
        ))}</ul>}
        <nav aria-label="Páginas de incidencias" className="surface-card flex flex-wrap items-center justify-between gap-3">
          <Button variant="secondary" size="lg" disabled={filters.page === 0} onClick={() => changeFilters({ ...filters, page: filters.page - 1 })}>Anterior</Button>
          <p className="text-sm text-neutral-700">{list.data.page.totalElements} registros · Página {filters.page + 1} de {Math.max(1, list.data.page.totalPages)}</p>
          <Button variant="secondary" size="lg" disabled={filters.page + 1 >= list.data.page.totalPages} onClick={() => changeFilters({ ...filters, page: filters.page + 1 })}>Siguiente</Button>
        </nav>
      </>}
    </div>
  );
}
