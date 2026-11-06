'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BackButton, Breadcrumb, EmptyState, LoadingSkeleton } from '@/components/ui';
import { useInventarioVerdeSpecimenByCode } from '@/hooks/useInventarioVerde';
import { useRememberedHref } from '@/hooks/useRememberedHref';
import { SpecimenAssessments } from './SpecimenAssessments';
import { SpecimenInfo } from './SpecimenInfo';
import { SpecimenInterventions } from './SpecimenInterventions';


export interface SpecimenDetailScreenProps {
  code: string;
}

const LIST_PATH = '/catastro/ejemplares';

export function SpecimenDetailScreen({ code }: SpecimenDetailScreenProps) {
  const router = useRouter();
  const listHref = useRememberedHref(LIST_PATH);
  const [reloadKey, setReloadKey] = useState(0);
  const { specimen, loading, errorMessage } = useInventarioVerdeSpecimenByCode(code, reloadKey);

  if (loading && !specimen) {
    return (
      <div className="flex flex-col gap-6">
        <LoadingSkeleton variant="card" />
      </div>
    );
  }

  if (!specimen) {
    return (
      <div className="flex flex-col gap-6">
        <Breadcrumb
          items={[
            { label: 'Catastro de Ejemplares', href: listHref },
            { label: 'Ejemplar no encontrado' },
          ]}
        />
        <EmptyState
          title={errorMessage ? 'No se pudo cargar el ejemplar' : 'Ejemplar no encontrado'}
          description={errorMessage ?? 'El ejemplar solicitado no está en el inventario o fue dado de baja.'}
          action={{
            label: 'Volver a ejemplares',
            onClick: () => router.push(listHref),
          }}
        />
      </div>
    );
  }

  const breadcrumbItems = [
    { label: 'Catastro de Ejemplares', href: listHref },
    { label: `Ejemplar ${specimen.code}` },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <div className="mb-4 flex items-center gap-2">
        <BackButton fallbackHref={LIST_PATH} />
        <Breadcrumb items={breadcrumbItems} />
      </div>

      <SpecimenInfo specimen={specimen} onSpecimenUpdated={() => setReloadKey((k) => k + 1)} />

      <SpecimenInterventions code={specimen.code} />
      <SpecimenAssessments key={reloadKey} code={specimen.code} />
    </div>
  );
}
