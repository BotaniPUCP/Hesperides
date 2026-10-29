'use client';

import { useRouter } from 'next/navigation';
import { Breadcrumb } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useIncidentNavigation } from '@/hooks/useIncidents';
import { IncidentCaptureForm } from './IncidentCaptureForm';

export function IncidentCaptureScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { href, listHref } = useIncidentNavigation();

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Incidencias', href: listHref }, { label: 'Informar' }]} />
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900">Informar una incidencia</h1>
        <p className="mt-1 text-sm text-neutral-700">Una frase basta. Las fotos y la ubicación son opcionales.</p>
      </header>
      <div className="mx-auto max-w-2xl">
        <IncidentCaptureForm sender={user?.fullName ?? ''} onCancel={() => router.push(listHref)}
          onDone={(id) => router.replace(href(`/incidencias/${id}`))} />
      </div>
    </div>
  );
}
