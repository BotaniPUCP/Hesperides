import { Suspense } from 'react';
import { LoadingSkeleton } from '@/components/ui';
import { MaintenanceFrequenciesScreen } from '@/components/maintenance/MaintenanceFrequenciesScreen';

export const metadata = {
  title: 'Frecuencias de Mantenimiento · Hesperides',
};

export default function FrecuenciasPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <Suspense fallback={<LoadingSkeleton />}>
        <MaintenanceFrequenciesScreen />
      </Suspense>
    </div>
  );
}
