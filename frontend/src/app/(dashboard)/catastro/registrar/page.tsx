import type { Metadata } from 'next';
import { RegistrarScreen } from '@/components/catastro/registrar/RegistrarScreen';

export const metadata: Metadata = {
  title: 'Registrar planta · Hesperides',
};

export default function RegistrarPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <RegistrarScreen />
    </div>
  );
}
