'use client';

import { useRouter } from 'next/navigation';
import { Breadcrumb, EmptyState, LoadingSkeleton } from '@/components/ui';
import { useInventarioVerdeSpecimenByCode } from '@/hooks/useInventarioVerde';
import { SpecimenAssessments } from './SpecimenAssessments';
import { SpecimenInfo } from './SpecimenInfo';
import { SpecimenInterventions } from './SpecimenInterventions';

export interface SpecimenDetailScreenProps {
  code: string;
}

export function SpecimenDetailScreen({ code }: SpecimenDetailScreenProps) {
  const router = useRouter();
  const { specimen, loading, errorMessage } = useInventarioVerdeSpecimenByCode(code);

  if (loading) {
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
            { label: 'Catastro de Ejemplares', href: '/catastro/ejemplares' },
            { label: 'Ejemplar no encontrado' },
          ]}
        />
        <EmptyState
          title={errorMessage ? 'No se pudo cargar el ejemplar' : 'Ejemplar no encontrado'}
          description={errorMessage ?? 'El ejemplar solicitado no está en el inventario o fue dado de baja.'}
          action={{
            label: 'Volver a ejemplares',
            onClick: () => router.push('/catastro/ejemplares'),
          }}
        />
      </div>
    );
  }

  const breadcrumbItems = [
    { label: 'Catastro de Ejemplares', href: '/catastro/ejemplares' },
    { label: `Ejemplar ${specimen.code}` },
  ];

  return (
    <div className="flex flex-col">
      <div className="mb-4">
        <Breadcrumb items={breadcrumbItems} />
      </div>

      <SpecimenInfo specimen={specimen} />
      <SpecimenInterventions code={specimen.code} />
      <SpecimenAssessments code={specimen.code} />
    </div>
  );
}
