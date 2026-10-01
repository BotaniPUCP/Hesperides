import { InventarioVerdeScreen } from '@/components/inventario-verde/InventarioVerdeScreen';

export const metadata = {
  title: 'Inventario de Especies · Inventario Verde · Hesperides',
  description: 'Inventario botánico y consulta de especies y ejemplares del campus PUCP.',
};

export default function InventarioVerdePage() {
  return (
    <main className="min-h-screen bg-neutral-50 p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <InventarioVerdeScreen />
      </div>
    </main>
  );
}
