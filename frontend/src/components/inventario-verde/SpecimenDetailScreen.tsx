'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePageTrail } from '@/components/layouts/PageTrailContext';
import { EmptyState, LoadingSkeleton } from '@/components/ui';
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
  // Solo aplica al llegar desde la ficha de la especie, cuyo slug está en la URL.
  usePageTrail(specimen ? { labels: { [specimen.species.slug]: specimen.species.commonName } } : {});

  if (loading && !specimen) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton variant="card" />
      </div>
    );
  }

  if (!specimen) {
    return (
      <div className="space-y-6">
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

  return (
    <div className="space-y-6">
      <SpecimenInfo specimen={specimen} onSpecimenUpdated={() => setReloadKey((k) => k + 1)} />

      <SpecimenInterventions code={specimen.code} />
      <SpecimenAssessments key={reloadKey} code={specimen.code} />
    </div>
  );
}
