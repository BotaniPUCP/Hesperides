import { SpeciesDetailScreen } from '@/components/inventario-verde/SpeciesDetailScreen';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const metadata = {
  title: 'Detalle de Especie y Ejemplares · Inventario de Especies · Hesperides',
  description: 'Consulta de ejemplares botánicos censados por especie en el campus PUCP.',
};

export default async function SpeciesDetailPage({ params }: PageProps) {
  const { slug } = await params;

  return (
    <main className="min-h-screen bg-neutral-50 p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl">
        <SpeciesDetailScreen slug={slug} />
      </div>
    </main>
  );
}
