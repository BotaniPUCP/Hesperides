import type { Metadata } from 'next';
import { EstandarEspeciesScreen } from '@/components/inventario-verde/EstandarEspeciesScreen';

export const metadata: Metadata = {
  title: 'Estándar de especies · Hesperides',
};

export default function EstandarEspeciesPage() {
  return <EstandarEspeciesScreen />;
}
