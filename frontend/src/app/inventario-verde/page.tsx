import { Suspense } from 'react';
import { LoadingSkeleton } from '@/components/ui';
import { InventarioVerdeScreen } from '@/components/inventario-verde/InventarioVerdeScreen';

export const metadata = {
  title: 'Especies · Catálogo botánico · Hesperides',
  description: 'Inventario botánico y consulta de especies y ejemplares del campus PUCP.',
};

export default function InventarioVerdePage() {
  return (
    <main className="min-h-screen p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <Suspense fallback={<LoadingSkeleton />}>
          <InventarioVerdeScreen />
        </Suspense>
      </div>
    </main>
  );
}
