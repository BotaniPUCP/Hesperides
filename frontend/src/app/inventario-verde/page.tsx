import { Suspense } from 'react';
import { LoadingSkeleton } from '@/components/ui';
import { InventarioVerdeScreen } from '@/components/inventario-verde/InventarioVerdeScreen';

export const metadata = {
  title: 'Especies · Catálogo botánico · Hesperides',
  description: 'Inventario botánico y consulta de especies y ejemplares del campus PUCP.',
};

export default function InventarioVerdePage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <InventarioVerdeScreen />
    </Suspense>
  );
}
