import { Suspense } from 'react';
import { LoadingSkeleton } from '@/components/ui';
import { PlanningScreen } from '@/components/planning/PlanningScreen';

export const metadata = { title: 'Planificación preventiva · Hesperides' };

/** Suspense: el filtro por frecuencia vive en la URL y leerla obliga a esperar al cliente. */
export default function PlanningPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <PlanningScreen />
    </Suspense>
  );
}
