import { Suspense } from 'react';
import { LoadingSkeleton } from '@/components/ui';
import { LugaresScreen } from '@/components/lugares/LugaresScreen';

export const metadata = {
  title: 'Lugares del campus · Hesperides',
};

export default function LugaresPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <LugaresScreen />
    </Suspense>
  );
}
