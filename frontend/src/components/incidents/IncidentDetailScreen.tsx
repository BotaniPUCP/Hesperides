'use client';

import { Breadcrumb, Button, EmptyState, LoadingSkeleton } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useIncidentDetail, useIncidentNavigation, useIncidentOptions } from '@/hooks/useIncidents';
import { IncidentDetailPanel } from './IncidentDetailPanel';

export interface IncidentDetailScreenProps {
  id: number;
}

export function IncidentDetailScreen({ id }: IncidentDetailScreenProps) {
  const { user } = useAuth();
  const { listHref } = useIncidentNavigation();
  const detail = useIncidentDetail(id);
  const options = useIncidentOptions();
  const reload = () => { detail.reload(); options.reload(); };

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Incidencias', href: listHref }, { label: `Incidencia #${id}` }]} />
      {detail.loading ? <LoadingSkeleton variant="card" count={3} /> : detail.notFound ? (
        <EmptyState title="Incidencia no encontrada" description="El registro no existe o no tienes acceso a él." />
      ) : detail.errorMessage ? (
        <div role="alert" className="space-y-3 rounded-lg bg-alert-danger-bg p-4 text-alert-danger-fg">
          <p>{detail.errorMessage}</p><Button variant="secondary" size="lg" onClick={detail.reload}>Reintentar</Button>
        </div>
      ) : detail.data && (
        <>
          {options.errorMessage && (
            <div role="alert" className="space-y-3 rounded-lg bg-alert-warning-bg p-4 text-alert-warning-fg">
              <p>No se pudieron cargar las opciones de revisión. {options.errorMessage}</p>
              <Button variant="secondary" size="lg" onClick={options.reload}>Reintentar opciones</Button>
            </div>
          )}
          <IncidentDetailPanel key={id} detail={detail.data} options={options.data} optionsLoading={options.loading}
            coordinator={user?.role.code === 'COORDINADOR'} onChange={detail.updateData} onReload={reload} />
        </>
      )}
    </div>
  );
}
