'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { managesIncidents } from '@/lib/incidentRoles';
import { Button, Modal, StatusBadge } from '@/components/ui';
import { interventionsApi, interventionError, type InterventionDetail } from '@/lib/interventions-api';
import { activityStatus, activityStatusLabel } from './activityPresentation';
import { ActivityPreviousHistory } from './ActivityPreviousHistory';
import { InterventionIncidentLinks } from './InterventionIncidentLinks';

/** Closed historical records are readable; obsolete execution controls are never exposed. */
export function HistoricalActivityDetail({data,onReload}:{data:InterventionDetail;onReload:()=>Promise<void>}) {
  const {user}=useAuth();
  const [photo,setPhoto]=useState<{url:string;caption:string}|null>(null);const [error,setError]=useState('');
  useEffect(()=>()=>{if(photo)URL.revokeObjectURL(photo.url);},[photo]);
  return <section className="space-y-6"><div className="surface-card flex flex-wrap items-center justify-between gap-3">
    <h1 className="page-title">{data.activityTitle||'Actividad'}</h1><StatusBadge showIcon code={activityStatus(data.statusCode)} label={activityStatusLabel(data.statusCode)}/></div>
    <div className="surface-card space-y-2"><p className="text-xs text-neutral-500">Código: {data.code}</p><p>{data.description}</p><p>Programada: {data.scheduledDate}</p>
      {data.startedAt&&<p>Inicio de ejecución: {new Date(data.startedAt).toLocaleString('es-PE',{timeZone:'America/Lima'})}</p>}
      {data.completedAt&&<p>Fin de ejecución: {new Date(data.completedAt).toLocaleString('es-PE',{timeZone:'America/Lima'})}</p>}
      {data.validatedAt&&<p>Aprobación registrada: {new Date(data.validatedAt).toLocaleString('es-PE',{timeZone:'America/Lima'})}</p>}
      <p>Se conserva el historial de esta actividad.</p></div>
    <section className="surface-card space-y-3"><h2 className="text-lg font-semibold">Jardines y ejemplares de la actividad</h2>
      {data.locations.map((l,i)=><div key={l.id??l.clientReference} className="rounded-md border border-neutral-200 p-3">
        <p>{l.description||l.locationDescription||`Objetivo ${i+1}`}</p>{l.executionNotes&&<p>{l.executionNotes}</p>}
      </div>)}
    </section>
    <ActivityPreviousHistory events={data.history??[]}/>
    <div className="surface-card"><InterventionIncidentLinks interventionId={data.id} incidents={data.sourceIncidents??[]} canManage={managesIncidents(user?.role.code)} onChanged={()=>void onReload().catch(e=>setError(interventionError(e)))}/></div>
    <section className="surface-card space-y-3"><h2 className="text-lg font-semibold">Fotos conservadas</h2>
      {(data.evidences??[]).filter(e=>e.uploadedAt).map(e=><div key={e.id}><Button variant="secondary" onClick={async()=>{try{const blob=await interventionsApi.photo(data.id,e.id);setPhoto({url:URL.createObjectURL(blob),caption:e.caption||'Foto del trabajo'});}catch(err){setError(interventionError(err));}}}>Ver foto{e.caption?` · ${e.caption}`:''}</Button></div>)}
      {error&&<p role="alert">{error}</p>}
    </section>
    <Modal isOpen={!!photo} title="Foto de la actividad" onClose={()=>setPhoto(null)} size="lg">{photo&&<>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photo.url} alt={photo.caption} className="max-h-[75vh] w-full object-contain"/>
    </>}</Modal>
  </section>;
}
