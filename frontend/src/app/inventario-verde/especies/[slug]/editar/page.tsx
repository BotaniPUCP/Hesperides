import { EdicionEspecieScreen } from '@/components/inventario-verde/EdicionEspecieScreen';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const metadata = {
  title: 'Editar especie · Especies · Hesperides',
  description: 'Corrección de los datos y las medidas de una especie del catálogo.',
};

export default async function EditarEspeciePage({ params }: PageProps) {
  const { slug } = await params;

  return (
    <EdicionEspecieScreen slug={slug} />
  );
}
