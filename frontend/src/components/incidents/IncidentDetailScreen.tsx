'use client';

import { useEffect } from 'react';
import { usePageTrail } from '@/components/layouts/PageTrailContext';
import { Button, EmptyState, LoadingSkeleton } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useIncidentDetail, useIncidentNavigation, useIncidentOptions } from '@/hooks/useIncidents';
import { IncidentDetailPanel } from './IncidentDetailPanel';
import { incidentQuery, interventionCreationHref } from '@/lib/incidentNavigation';
import { rememberListQuery } from '@/lib/listMemory';

export interface IncidentDetailScreenProps {
  id: number;
  selectedInterventionId?: number | null;
}

export function IncidentDetailScreen({ id, selectedInterventionId = null }: IncidentDetailScreenProps) {
  const { user } = useAuth();
  const { filters } = useIncidentNavigation();
  const detail = useIncidentDetail(id);
  const options = useIncidentOptions();
  const reload = () => { detail.reload(); options.reload(); };
  const query = incidentQuery(filters);
  usePageTrail({ labels: { [id]: detail.data?.incident.officialCode ?? `Incidencia #${id}` } });

  // El detalle lleva en su URL los filtros de la lista. Quien salga a una
  // intervención y regrese con la flecha debe recuperarlos.
  useEffect(() => {
    rememberListQuery(`/incidencias/${id}`, query);
  }, [id, query]);

  return (
    <div className="space-y-6">
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
            selectedInterventionId={selectedInterventionId} createInterventionHref={interventionCreationHref(id,filters)}
            coordinator={user?.role.code === 'COORDINADOR'} onChange={detail.updateData} onReload={reload} />
        </>
      )}
    </div>
  );
}
