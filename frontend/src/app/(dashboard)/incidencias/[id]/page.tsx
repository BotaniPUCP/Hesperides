import { notFound } from 'next/navigation';
import { IncidentDetailScreen } from '@/components/incidents/IncidentDetailScreen';

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata = { title: 'Detalle de incidencia · Hesperides' };

export default async function IncidentPage({ params }: PageProps) {
  const { id } = await params;
  const incidentId = Number(id);
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(incidentId)) notFound();
  return <IncidentDetailScreen id={incidentId} />;
}
