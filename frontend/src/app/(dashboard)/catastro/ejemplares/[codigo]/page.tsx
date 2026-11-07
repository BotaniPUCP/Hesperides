import type { Metadata } from 'next';
import { SpecimenDetailScreen } from '@/components/inventario-verde/SpecimenDetailScreen';

interface PageProps {
  params: Promise<{ codigo: string }>;
}

export const metadata: Metadata = {
  title: 'Ficha del Ejemplar · Catastro Verde · Hesperides',
  description: 'Detalle e información técnica del ejemplar botánico.',
};

export default async function CatastroSpecimenDetailPage({ params }: PageProps) {
  const { codigo } = await params;

  return (
    <SpecimenDetailScreen code={codigo} />
  );
}

