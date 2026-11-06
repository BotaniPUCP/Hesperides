import { notFound } from 'next/navigation';
import { IncidentDetailScreen } from '@/components/incidents/IncidentDetailScreen';
import { positiveIncidentId } from '@/lib/incidentNavigation';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string,string|string[]|undefined>>;
}

export const metadata = { title: 'Detalle de incidencia · Hesperides' };

export default async function IncidentPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const incidentId = Number(id);
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(incidentId)) notFound();
  const query=await searchParams;
  return <IncidentDetailScreen id={incidentId} selectedInterventionId={positiveIncidentId(query?.selectIntervention)} />;
}
