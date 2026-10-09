import type { Metadata } from 'next';
import { ImportarScreen } from '@/components/catastro/importar/ImportarScreen';

export const metadata: Metadata = {
  title: 'Importar al catastro · Hesperides',
};

export default function ImportarPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <ImportarScreen />
    </div>
  );
}
