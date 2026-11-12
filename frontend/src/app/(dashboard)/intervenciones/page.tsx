import { InterventionsList } from '@/components/interventions/InterventionsList';

export const metadata = { title:'Intervenciones · Hesperides' };
export default async function InterventionsPage({searchParams}:{searchParams:Promise<{greenElementCode?:string|string[]}>}) {
  const {greenElementCode} = await searchParams;
  const code = Array.isArray(greenElementCode) ? greenElementCode[0] : greenElementCode;
  return <InterventionsList key={code ?? 'all'} greenElementCode={code} />;
}
