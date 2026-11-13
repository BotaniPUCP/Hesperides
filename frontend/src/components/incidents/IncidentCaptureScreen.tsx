'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useIncidentNavigation, useIncidentOptions } from '@/hooks/useIncidents';
import { IncidentCaptureForm } from './IncidentCaptureForm';
import { PageHeader } from '@/components/layouts/PageHeader';
import { IncidentMyReports } from './IncidentMyReports';
import { interventionCreationHref } from '@/lib/incidentNavigation';
import { IncidentWorkspace } from './IncidentWorkspace';

export function IncidentCaptureScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { href, listHref, filters } = useIncidentNavigation();
  const options = useIncidentOptions();

  return (
    <IncidentWorkspace>
      <PageHeader title="¿Qué encontraste?" description="Cuéntalo con tus palabras. Las fotos y la ubicación son opcionales." />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <IncidentCaptureForm key={user?.id} sender={user?.fullName ?? ''} scopeKey={`${user?.id}:${user?.role.code}`} onCancel={() => router.push(listHref)}
            options={options.data} optionsError={options.errorMessage} onRetryOptions={options.reload}
            onCreateIntervention={(id) => router.replace(interventionCreationHref(id, filters))}
            onDone={(id) => router.replace(href(`/incidencias/${id}`))} />
        </div>
        <aside className="min-w-0"><IncidentMyReports /></aside>
      </div>
    </IncidentWorkspace>
  );
}
