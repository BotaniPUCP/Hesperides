import { Suspense } from 'react';
import { LoadingSkeleton } from '@/components/ui';
import { MaintenanceFrequenciesScreen } from '@/components/maintenance/MaintenanceFrequenciesScreen';

export const metadata = {
  title: 'Frecuencias · Hesperides',
};

/** Suspense: los filtros viven en la URL y leerla obliga a esperar al cliente. */
export default function FrecuenciasPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <MaintenanceFrequenciesScreen />
    </Suspense>
  );
}
