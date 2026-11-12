import type { Metadata } from 'next';
import { EstandaresScreen } from '@/components/catastro/EstandaresScreen';

export const metadata: Metadata = {
  title: 'Estándares de carga · Hesperides',
};

export default function EstandaresPage() {
  return (
    <EstandaresScreen />
  );
}
