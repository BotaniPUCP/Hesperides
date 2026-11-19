'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

import { ActivityExecutionDetail } from './ActivityExecutionDetail';
import { type InterventionDetail } from '@/lib/interventions-api';
import { InterventionForm } from './InterventionForm';
import { activityStatus } from './activityPresentation';


/** Keep legacy planning projection only for the compatible planning editor. */
export function ActivityPlanningDetail({data,edit}:{data:InterventionDetail;edit:boolean;onReload:()=>Promise<void>}) {
  const {user}=useAuth();
  const code=activityStatus(data.statusCode);
  const canPlan=['ADMIN','COORDINADOR'].includes(user?.role.code??'')&&code==='PLANNED'&&!!data.campusSelectionRevision;
  if(edit)return canPlan?<InterventionForm initial={data}/>:<p>La planificación está cerrada. <Link href={`/intervenciones/${data.id}`} className="underline">Volver al detalle</Link></p>;
  return <ActivityExecutionDetail id={data.id}/>;
}
