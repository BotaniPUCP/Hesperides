import { SpecimenDetailScreen } from '@/components/inventario-verde/SpecimenDetailScreen';

interface PageProps {
  params: Promise<{ slug: string; codigo: string }>;
}

export const metadata = {
  title: 'Ficha del Ejemplar · Inventario Verde · Hesperides',
  description: 'Detalle e información técnica del ejemplar botánico.',
};

export default async function SpecimenDetailPage({ params }: PageProps) {
  const { codigo } = await params;

  return (
    <SpecimenDetailScreen code={codigo} />
  );
}

