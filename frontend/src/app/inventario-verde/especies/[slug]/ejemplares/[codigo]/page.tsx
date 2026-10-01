import { SpecimenDetailScreen } from '@/components/inventario-verde/SpecimenDetailScreen';

interface PageProps {
  params: Promise<{ slug: string; codigo: string }>;
}

export const metadata = {
  title: 'Ficha de Ejemplar · Inventario Verde · Hesperides',
  description: 'Ficha técnica individual del ejemplar botánico del campus PUCP.',
};

export default async function SpecimenDetailPage({ params }: PageProps) {
  const { codigo } = await params;

  return (
    <main className="min-h-screen bg-neutral-50 p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl">
        <SpecimenDetailScreen code={codigo} />
      </div>
    </main>
  );
}
