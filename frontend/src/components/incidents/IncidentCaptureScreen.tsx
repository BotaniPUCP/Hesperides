'use client';

import { useRouter } from 'next/navigation';
import { Breadcrumb } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useIncidentNavigation,useIncidentOptions } from '@/hooks/useIncidents';
import { IncidentCaptureForm } from './IncidentCaptureForm';
import { IncidentMyReports } from './IncidentMyReports';
import { interventionCreationHref } from '@/lib/incidentNavigation';

export function IncidentCaptureScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { href, listHref,filters } = useIncidentNavigation();
  const options=useIncidentOptions();

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Incidencias', href: listHref }, { label: 'Informar' }]} />
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900">Informar una incidencia</h1>
        <p className="mt-1 text-sm text-neutral-700">Una frase basta. Las fotos y la ubicación son opcionales.</p>
      </header>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="min-w-0">
        <IncidentCaptureForm key={user?.id} sender={user?.fullName ?? ''} scopeKey={`${user?.id}:${user?.role.code}`} onCancel={() => router.push(listHref)}
          options={options.data} optionsError={options.errorMessage} onRetryOptions={options.reload}
          onCreateIntervention={(id) => router.replace(interventionCreationHref(id,filters))}
          onDone={(id) => router.replace(href(`/incidencias/${id}`))} />
        </div>
        <aside className="min-w-0"><IncidentMyReports /></aside>
      </div>
    </div>
  );
}
