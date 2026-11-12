'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useIncidentNavigation } from '@/hooks/useIncidents';
import { IncidentCaptureForm } from './IncidentCaptureForm';
import { PageHeader } from '@/components/layouts/PageHeader';

export function IncidentCaptureScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { href, listHref } = useIncidentNavigation();

  return (
    <div className="space-y-6">
      <PageHeader title="Informar una incidencia" description="Una frase basta. Las fotos y la ubicación son opcionales." />
      <IncidentCaptureForm sender={user?.fullName ?? ''} onCancel={() => router.push(listHref)}
        onDone={(id) => router.replace(href(`/incidencias/${id}`))} />
    </div>
  );
}
