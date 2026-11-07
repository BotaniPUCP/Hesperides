import { SpeciesDetailScreen } from '@/components/inventario-verde/SpeciesDetailScreen';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const metadata = {
  title: 'Detalle de Especie y Ejemplares · Especies · Hesperides',
  description: 'Consulta de ejemplares botánicos censados por especie en el campus PUCP.',
};

export default async function SpeciesDetailPage({ params }: PageProps) {
  const { slug } = await params;

  return (
    <SpeciesDetailScreen slug={slug} />
  );
}
