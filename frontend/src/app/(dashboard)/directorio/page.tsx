import { Suspense } from 'react';
import { LoadingSkeleton } from '@/components/ui';
import { DirectorioScreen } from '@/components/directorio/DirectorioScreen';

export const metadata = {
  title: 'Directorio · Hesperides',
};

export default function DirectorioPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <DirectorioScreen />
    </Suspense>
  );
}
