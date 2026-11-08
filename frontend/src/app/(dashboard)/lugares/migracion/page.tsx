import { Suspense } from 'react';
import { LoadingSkeleton } from '@/components/ui';
import { ReferenceMigrationScreen } from '@/components/lugares/migracion/ReferenceMigrationScreen';

export const metadata = {
  title: 'Migrar referencias · Catálogo de lugares · Hesperides',
};

export default function ReferenceMigrationPage() {
  // La búsqueda y la página viven en la URL (useSearchParams): Next.js exige el Suspense.
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <ReferenceMigrationScreen />
    </Suspense>
  );
}
