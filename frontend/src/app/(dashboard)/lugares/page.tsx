import { Suspense } from 'react';
import { LoadingSkeleton } from '@/components/ui';
import { LugaresScreen } from '@/components/lugares/LugaresScreen';

export const metadata = {
  title: 'Catálogo de lugares · Hesperides',
};

export default function LugaresPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <LugaresScreen />
    </Suspense>
  );
}
