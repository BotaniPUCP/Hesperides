import { InterventionForm } from '@/components/interventions/InterventionForm';
import { incidentFilters, positiveIncidentId } from '@/lib/incidentNavigation';

export const metadata = { title:'Nueva intervención · Hesperides' };
export default async function NewInterventionPage({ searchParams }: { searchParams?: Promise<Record<string,string|string[]|undefined>> } = {}) {
  const query=await searchParams ?? {};
  const filters=incidentFilters(new URLSearchParams({ search: typeof query.incidentSearch==='string' ? query.incidentSearch : '',
    status: typeof query.incidentStatus==='string' ? query.incidentStatus : '', page: typeof query.incidentPage==='string' ? query.incidentPage : '0' }));
  return <InterventionForm fromIncident={positiveIncidentId(query.fromIncident)} returnFilters={filters} />;
}
