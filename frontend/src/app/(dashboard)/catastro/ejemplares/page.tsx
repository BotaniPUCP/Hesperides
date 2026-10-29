import type { Metadata } from 'next';
import { InventarioEjemplaresScreen } from '@/components/inventario-verde/InventarioEjemplaresScreen';

export const metadata: Metadata = {
  title: 'Catastro de Ejemplares · Catastro Verde · Hesperides',
  description: 'Inventario georreferenciado de ejemplares botánicos censados en el campus PUCP.',
};

export default function CatastroEjemplaresPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <InventarioEjemplaresScreen />
    </div>
  );
}
