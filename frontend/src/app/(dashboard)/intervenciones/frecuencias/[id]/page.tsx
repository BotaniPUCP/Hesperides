import { FrequencyFormScreen } from '@/components/maintenance/FrequencyFormScreen';

export const metadata = { title: 'Frecuencia · Hesperides' };

export default async function FrecuenciaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <FrequencyFormScreen key={id} frequencyId={Number(id)} />;
}
