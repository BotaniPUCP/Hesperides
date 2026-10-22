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
  const { specimen, species, loading, errorMessage } = useInventarioVerdeSpecimenByCode(code);

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
            { label: 'Inventario Verde', href: '/inventario-verde' },
            { label: 'Especies', href: '/inventario-verde' },
            { label: 'Ejemplar no encontrado' },
          ]}
        />
        <EmptyState
          title={errorMessage ? 'No se pudo cargar el ejemplar' : 'Ejemplar no encontrado'}
          description={errorMessage ?? 'El ejemplar solicitado no está en el inventario o fue dado de baja.'}
          action={{
            label: 'Volver al catálogo principal',
            onClick: () => router.push('/inventario-verde'),
          }}
        />
      </div>
    );
  }

  const breadcrumbItems = [
    { label: 'Inventario Verde', href: '/inventario-verde' },
    {
      label: species?.commonName || 'Especies',
      href: species ? `/inventario-verde/especies/${species.slug}` : '/inventario-verde',
    },
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
