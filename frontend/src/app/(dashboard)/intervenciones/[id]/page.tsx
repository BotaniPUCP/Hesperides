import { InterventionDetail } from '@/components/interventions/InterventionDetail';

export default async function InterventionPage({params}:{params:Promise<{id:string}>}) {
  const {id} = await params;
  return <InterventionDetail key={id} id={Number(id)} />;
}
