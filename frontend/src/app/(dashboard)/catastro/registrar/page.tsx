import type { Metadata } from 'next';
import { RegistrarScreen } from '@/components/catastro/registrar/RegistrarScreen';

export const metadata: Metadata = {
  title: 'Registrar en el catastro · Hesperides',
};

export default function RegistrarPage() {
  return (
    <RegistrarScreen />
  );
}
