import { GreenAreaSetForm } from '@/components/planning/GreenAreaSetForm';

export const metadata = { title: 'Conjunto de áreas verdes · Hesperides' };

export default async function GreenAreaSetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <GreenAreaSetForm key={id} setId={Number(id)} />;
}
