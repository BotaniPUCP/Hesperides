'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRequest } from '@/hooks/useRequest';
import { useRememberedHref } from '@/hooks/useRememberedHref';
import { LoadingSkeleton, Button } from '@/components/ui';
import { interventionsApi } from '@/lib/interventions-api';
import { usePageTrail } from '@/components/layouts/PageTrailContext';
import { ActivityPlanningDetail } from './ActivityPlanningDetail';
import { HistoricalActivityDetail } from './HistoricalActivityDetail';

export function InterventionDetail({id,edit=false}:{id:number;edit?:boolean}) {
  const [revision,setRevision]=useState(0);
  const valid=Number.isSafeInteger(id)&&id>0;
  const query=useRequest(valid?`activity-detail:${id}:${revision}`:null,()=>interventionsApi.detail(id));
  const data=query.data;const listHref=useRememberedHref('/intervenciones');
  usePageTrail(data?{labels:{[id]:data.activityTitle||'Detalle de actividad'}}:{});
  if(!valid)return <p role="alert">Actividad no válida.</p>;
  if(query.loading)return <LoadingSkeleton variant="card"/>;
  if(!data)return <div role="alert"><p>{query.errorMessage??'La actividad no está disponible para tu cuenta.'}</p><Button variant="secondary" onClick={()=>setRevision(n=>n+1)}>Reintentar</Button><Link href={listHref}>Volver al listado</Link></div>;
  if(data.activityWorkflow)return <ActivityPlanningDetail data={data} edit={edit} onReload={async()=>query.updateData(await interventionsApi.detail(id))}/>;
  return <HistoricalActivityDetail data={data} onReload={async()=>query.updateData(await interventionsApi.detail(id))}/>;
}
