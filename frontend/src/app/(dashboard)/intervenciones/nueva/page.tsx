import { InterventionForm } from '@/components/interventions/InterventionForm';
import { incidentFilters, positiveIncidentId } from '@/lib/incidentNavigation';

export const metadata = { title:'Nueva intervención · Hesperides' };
export default async function NewInterventionPage({ searchParams }: { searchParams?: Promise<Record<string,string|string[]|undefined>> } = {}) {
  const query=await searchParams ?? {};
  const back=new URLSearchParams();
  for(const key of ['search','status','page','severity','urgency','service','zoneId','registration','view']) {
    const value=query[`incident${key[0].toUpperCase()}${key.slice(1)}`];if(typeof value==='string')back.set(key,value);
  }
  const filters=incidentFilters(back);
  return <InterventionForm fromIncident={positiveIncidentId(query.fromIncident)} returnFilters={filters} />;
}
