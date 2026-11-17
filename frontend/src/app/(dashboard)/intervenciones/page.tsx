import { InterventionsList } from '@/components/interventions/InterventionsList';

export const metadata = { title:'Intervenciones · Hesperides' };
export default async function InterventionsPage({searchParams}:{searchParams:Promise<{greenElementCode?:string|string[];greenElementId?:string|string[]}>}) {
  const {greenElementCode, greenElementId} = await searchParams;
  const code = Array.isArray(greenElementCode) ? greenElementCode[0] : greenElementCode;
  const rawId = Array.isArray(greenElementId) ? greenElementId[0] : greenElementId;
  const id = rawId && /^[1-9]\d{0,18}$/.test(rawId) ? rawId : undefined;
  return <InterventionsList key={`${id ?? ''}:${code ?? 'all'}`} greenElementCode={code} greenElementId={id} />;
}
