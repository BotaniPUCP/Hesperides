'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { managesIncidents } from '@/lib/incidentRoles';
import { useRequest } from '@/hooks/useRequest';
import { Button, Modal, StatusBadge } from '@/components/ui';
import { activitiesApi, interventionError, type ActivityDetail } from '@/lib/interventions-api';
import { ActivityProgressForm } from './ActivityProgressForm';
import { ActivityTargets } from './ActivityTargets';
import { ActivityPhotos } from './ActivityPhotos';
import { InterventionIncidentLinks } from './InterventionIncidentLinks';
import { activityStatusLabel } from './activityPresentation';
import { progressTargetName, TARGET_STATES } from './activityProgress';
import { ActivityPreviousHistory } from './ActivityPreviousHistory';

const dateTime=(s:string|null)=>s?new Date(s).toLocaleString('es-PE',{timeZone:'America/Lima'}):'Sin registrar';
export function ActivityExecutionDetail({id}:{id:number}) {
  const {user}=useAuth();const query=useRequest(`activity-execution:${id}`,()=>activitiesApi.detail(id));
  const options=useRequest(`activity-execution-options:${user?.id}`,activitiesApi.options);
  const [editing,setEditing]=useState(false);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const [dialog,setDialog]=useState<'cancel'|'approve'|'responsible'|null>(null);const [reason,setReason]=useState('');const [responsible,setResponsible]=useState('');
  const work=query.data;
  const reload=async()=>query.updateData(await activitiesApi.detail(id));
  const mutate=async(command:()=>Promise<ActivityDetail>)=>{
    if(busy)return;setBusy(true);setError('');
    try{query.updateData(await command());setDialog(null);}catch(e){setError(interventionError(e));await reload().catch(()=>undefined);}finally{setBusy(false);}
  };
  if(query.loading)return <p role="status">Cargando actividad…</p>;
  if(!work)return <p role="alert">{query.errorMessage??'La actividad no está disponible para tu cuenta.'}</p>;
  const allowed=(action:string)=>work.allowedActions.includes(action);
  const owner=options.data?.supervisors.find(s=>s.id===work.responsibleSupervisorUserId)?.name??(work.responsibleSupervisorUserId===user?.id?user?.fullName:null);
  const targets=work.targets.map(t=>({locationId:t.id,statusCode:t.statusCode,partialDescription:t.partialDescription}));
  return <section className="space-y-6">
    <div className="surface-card flex flex-wrap items-center justify-between gap-3"><h1 className="page-title">{work.activityTitle}</h1>
      <StatusBadge showIcon code={work.statusCode} label={options.data?.statuses.find(s=>s.code===work.statusCode)?.label??activityStatusLabel(work.statusCode)}/></div>
    <div className="surface-card space-y-3">
      <p className="font-semibold">Avance acumulado: {work.percentage===null?(work.legacyBaselinePending?'Porcentaje global pendiente de registrar':'Sin avances registrados'):`${work.percentage} %`}</p>
      <details key={editing?'progress-details':'activity-details'} open={!editing}>
      <summary className="cursor-pointer rounded-sm font-semibold focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-600">Detalles de la actividad</summary>
      <div className="mt-3 space-y-3">
      <p className="text-xs text-neutral-500">Código: {work.code}</p>{work.description&&<p>{work.description}</p>}
      <p>Programada: {work.scheduledDate}</p><p>Capataz responsable: {owner??(work.responsibleSupervisorUserId?'Responsable registrado':'Sin responsable; se asignará al guardar el primer avance.')}</p>
      {work.legacyBaselinePending&&<p>Esta actividad conserva el trabajo anterior. El capataz registrará el porcentaje acumulado real al guardar el primer avance global.</p>}
      <p>Inicio de ejecución: {dateTime(work.startedAt)}</p><p>Fin de ejecución: {dateTime(work.executedAt)}</p>
      {work.elapsedSeconds!=null&&<p>Tiempo transcurrido de ejecución: {Math.floor(work.elapsedSeconds/3600)} h {Math.floor(work.elapsedSeconds%3600/60)} min</p>}
      {work.finishedAt&&<p>Aprobación del coordinador: {dateTime(work.finishedAt)}</p>}
      {work.cancelledAt&&<p>Cancelada: {dateTime(work.cancelledAt)}{work.cancellationReason?` · ${work.cancellationReason}`:''}</p>}
      {work.executionBlockedUntil&&<p>El trabajo podrá iniciarse desde el {work.executionBlockedUntil}.</p>}
      {work.plannedSurfaceM2!=null&&<p>Superficie planificada: {work.plannedSurfaceM2.toLocaleString('es-PE',{maximumFractionDigits:2})} m²</p>}
      </div></details>
      {!editing&&<div className="flex flex-wrap gap-3">
        {allowed('progress')&&<Button onClick={()=>setEditing(true)}>Subir avance</Button>}
        {allowed('planning')&&<Link className="rounded-md border border-neutral-200 px-4 py-2 font-medium" href={`/intervenciones/${id}/editar`}>Editar planificación</Link>}
        {allowed('responsible')&&<Button variant="secondary" disabled={busy} onClick={()=>{setResponsible(work.responsibleSupervisorUserId?.toString()??'');setDialog('responsible');}}>Cambiar responsable</Button>}
        {allowed('approve')&&<Button disabled={busy} onClick={()=>setDialog('approve')}>Aprobar actividad</Button>}
        {allowed('cancel')&&<Button variant="danger" disabled={busy} onClick={()=>{setReason('');setDialog('cancel');}}>Cancelar actividad</Button>}
        <Button variant="secondary" disabled={busy} onClick={()=>void reload().catch(e=>setError(interventionError(e)))}>Actualizar información</Button>
      </div>}
      {error&&<p role="alert" className="text-action-danger">{error}</p>}
    </div>
    {editing?<ActivityProgressForm initial={work} onClose={()=>{setEditing(false);void reload().catch(e=>setError(interventionError(e)));}} onSaved={saved=>{query.updateData(saved);setEditing(false);}}/>:
      <><div className="surface-card"><ActivityTargets activity={work} targets={targets}/></div>
      <div className="surface-card"><ActivityPhotos work={work} onRefresh={reload}/></div></>}
    <section className="surface-card space-y-3" aria-label="Historial de avances"><h2 className="text-lg font-semibold">Historial de avances</h2>
      {!work.history.length&&<p>Aún no hay avances guardados.</p>}
      {[...work.history].sort((a,b)=>b.id-a.id).map(h=><details key={h.id} className="rounded-md border border-neutral-200 p-3">
        <summary className="cursor-pointer font-medium">{h.percentage} % · {h.actorName||'Capataz registrado'} · {dateTime(h.occurredAt)}</summary>
        <p className="my-2 whitespace-pre-wrap">{h.description}</p><ul className="space-y-1">{h.targets.map(t=>{
          const planned=work.targets.find(p=>p.id===t.locationId);const state=TARGET_STATES[t.statusCode as keyof typeof TARGET_STATES];
          return <li key={t.locationId}>{state?.symbol} {planned?progressTargetName(planned,null,work.targets.indexOf(planned)):'Objetivo registrado'}: {state?.label??t.statusCode}{t.partialDescription?` · ${t.partialDescription}`:''}</li>;
        })}</ul>
      </details>)}
    </section>
    <ActivityPreviousHistory events={work.previousHistory??[]} reports={work.previousReports??[]}/>
    {!editing&&<div className="surface-card"><InterventionIncidentLinks interventionId={id} incidents={work.sourceIncidents??[]} canManage={managesIncidents(user?.role.code)} onChanged={()=>void reload().catch(e=>setError(interventionError(e)))}/></div>}
    <Modal isOpen={dialog!==null} onClose={()=>{if(!busy)setDialog(null);}} closeOnEsc={!busy} closeOnOverlayClick={!busy}
      title={dialog==='cancel'?'Cancelar actividad':dialog==='approve'?'Aprobar actividad':'Cambiar capataz responsable'}>
      <div className="space-y-4">
        {dialog==='cancel'&&<><p>Se conservarán los avances y las fotos. La actividad quedará cancelada.</p><label className="block">Justificación (opcional)<textarea className="min-h-10 rounded-md border border-neutral-200 bg-neutral-0 p-3 text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-brand-600 disabled:bg-neutral-50 disabled:text-neutral-500 w-full" maxLength={2000} value={reason} disabled={busy} onChange={e=>setReason(e.target.value)}/></label></>}
        {dialog==='approve'&&<p>La actividad pasará a Terminada y ya no se podrán corregir sus avances.</p>}
        {dialog==='responsible'&&<label className="block">Capataz responsable<select className="min-h-10 rounded-md border border-neutral-200 bg-neutral-0 p-3 text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-brand-600 disabled:bg-neutral-50 disabled:text-neutral-500 w-full" value={responsible} disabled={busy} onChange={e=>setResponsible(e.target.value)}>
          {!work.startedAt&&<option value="">Sin responsable</option>}{work.startedAt&&!responsible&&<option value="" disabled>Selecciona un capataz</option>}
          {work.responsibleSupervisorUserId&&!options.data?.supervisors.some(s=>s.id===work.responsibleSupervisorUserId)&&<option value={work.responsibleSupervisorUserId} disabled>Responsable actual no disponible; selecciona otro</option>}
          {options.data?.supervisors.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>}
        {error&&<p role="alert" className="text-action-danger">{error}</p>}
        <div className="flex gap-3"><Button loading={busy} disabled={dialog==='responsible'&&((!!work.startedAt&&!responsible)||!options.data)} onClick={()=>void mutate(()=>dialog==='cancel'?activitiesApi.cancel(id,work.version,reason):dialog==='approve'?activitiesApi.approve(id,work.version):activitiesApi.responsible(id,work.version,responsible?Number(responsible):null))}>Confirmar</Button>
          <Button variant="secondary" disabled={busy} onClick={()=>setDialog(null)}>Volver</Button></div>
      </div>
    </Modal>
  </section>;
}
