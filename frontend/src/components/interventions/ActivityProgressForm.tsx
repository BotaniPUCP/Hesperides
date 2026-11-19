'use client';

import { useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui';
import { useUnsavedChangesGuard } from '@/components/forms/unsaved/useUnsavedChangesGuard';
import { ApiError } from '@/lib/api';
import { activitiesApi, interventionError, type ActivityDetail, type ActivityProgress } from '@/lib/interventions-api';
import { createClientUuid } from '@/lib/client-uuid';
import { ActivityTargets } from './ActivityTargets';
import { ActivityPhotos } from './ActivityPhotos';
import { percentageProblem, progressProblem, type ProgressTarget } from './activityProgress';

export function ActivityProgressForm({initial,onSaved,onClose}:{initial:ActivityDetail;onSaved:(work:ActivityDetail)=>void;onClose:()=>void}) {
  const {user}=useAuth();const [work,setWork]=useState(initial);
  const [percentage,setPercentage]=useState(String(initial.percentage??0));const [description,setDescription]=useState('');
  const [targets,setTargets]=useState<ProgressTarget[]>(()=>initial.targets.map(t=>({locationId:t.id,statusCode:t.statusCode,partialDescription:t.partialDescription})));
  const [dirty,setDirty]=useState(false);const [busy,setBusy]=useState(false);const [photoPending,setPhotoPending]=useState(false);
  const [uncertain,setUncertain]=useState(false);const [conflict,setConflict]=useState(false);const [error,setError]=useState('');
  const [showValidation,setShowValidation]=useState(false);
  const percentageError=showValidation?(percentage.trim()===''?'Indica el porcentaje acumulado.':percentageProblem(Number(percentage))):null;
  const descriptionError=showValidation&&!description.trim()?'Describe el avance realizado.':null;
  const attempt=useRef<ActivityProgress|null>(null);const guard=useUnsavedChangesGuard(dirty||photoPending||uncertain);
  const locked=busy||uncertain||conflict||!work.allowedActions.includes('progress');
  const fingerprint=(w:ActivityDetail)=>JSON.stringify([w.statusCode,w.responsibleSupervisorUserId,w.scheduledDate,w.description,w.targets,w.history.map(h=>h.id)]);
  const refresh=async()=>{
    const latest=await activitiesApi.detail(work.id);
    if(fingerprint(latest)!==fingerprint(work)){setConflict(true);setError('La actividad cambió. Revisa la versión actual antes de guardar tu borrador.');}
    setWork(latest);
  };
  const adoptCurrent=async()=>{
    const latest=await activitiesApi.detail(work.id);
    setTargets(previous=>latest.targets.map(t=>previous.find(p=>p.locationId===t.id)??{locationId:t.id,statusCode:t.statusCode,partialDescription:t.partialDescription}));
    setWork(latest);setConflict(false);setError('Revisa tu borrador con la información actual antes de guardar.');
  };
  const submit=async()=>{
    if(busy||conflict||photoPending||!work.allowedActions.includes('progress'))return;
    setShowValidation(true);
    if(!attempt.current){
      const problem=percentage.trim()===''?'Indica el porcentaje acumulado.':progressProblem(Number(percentage),description,targets);
      if(problem){setError(problem);return;}
      attempt.current={version:work.version,clientReference:createClientUuid(),percentage:Number(percentage),description:description.trim(),
        targets:targets.map(t=>({...t,partialDescription:t.statusCode==='PARTIAL'?t.partialDescription?.trim()??'':null})),
        evidenceIds:work.evidences.filter(e=>e.uploadedAt&&!e.historical&&!e.progressEntryId&&e.uploadedByUserId===user?.id).map(e=>e.id)};
    }
    setBusy(true);setError('');
    try{const saved=await activitiesApi.progress(work.id,attempt.current);attempt.current=null;setDirty(false);setUncertain(false);onSaved(saved);}
    catch(e){
      if(e instanceof ApiError&&e.status===409&&e.message==='Activity has changed; reload before retrying'){
        attempt.current=null;setUncertain(false);setConflict(true);
      }else if(e instanceof ApiError&&e.status>=400&&e.status<500&&e.status!==408&&e.status!==409&&e.status!==429){
        attempt.current=null;setUncertain(false);
        if(e.status===403||e.status===404)setWork(current=>({...current,allowedActions:current.allowedActions.filter(a=>a!=='progress')}));
      }
      else setUncertain(true);
      setError(interventionError(e));
    }finally{setBusy(false);}
  };
  return <section className="surface-card space-y-5" aria-label="Registrar avance global">
    <h2 className="text-xl font-semibold">Subir avance</h2>
    <p className="text-sm text-neutral-600">Los campos marcados con <span className="font-semibold text-action-danger">*</span> son obligatorios.</p>
    <p>Registra el porcentaje total acumulado y marca el estado de cada jardín y ejemplar. Al guardar el primer avance se inicia la actividad.</p>
    <fieldset disabled={locked} className="grid gap-3 sm:grid-cols-2">
      <div><label htmlFor="progress-percentage">Porcentaje acumulado (%) <span aria-hidden="true" className="text-action-danger">*</span></label><input id="progress-percentage" aria-label="Porcentaje acumulado (%)" className="min-h-10 rounded-md border border-neutral-200 bg-neutral-0 p-3 text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-brand-600 disabled:bg-neutral-50 disabled:text-neutral-500 w-full" type="number" min="0" max="100" step="0.01" required aria-invalid={!!percentageError} aria-describedby={percentageError?'progress-percentage-error':undefined} value={percentage} onChange={e=>{setPercentage(e.target.value);setDirty(true);}}/>
        {percentageError&&<p id="progress-percentage-error" className="mt-1 text-sm text-action-danger">{percentageError}</p>}</div>
      <div><label htmlFor="progress-description">Descripción del avance <span aria-hidden="true" className="text-action-danger">*</span></label><textarea id="progress-description" aria-label="Descripción del avance" className="min-h-10 rounded-md border border-neutral-200 bg-neutral-0 p-3 text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-brand-600 disabled:bg-neutral-50 disabled:text-neutral-500 w-full" value={description} maxLength={4000} required aria-invalid={!!descriptionError} aria-describedby={descriptionError?'progress-description-error':undefined} onChange={e=>{setDescription(e.target.value);setDirty(true);}}/>
        {descriptionError&&<p id="progress-description-error" className="mt-1 text-sm text-action-danger">{descriptionError}</p>}</div>
    </fieldset>
    <ActivityTargets activity={work} targets={targets} disabled={locked} showValidation={showValidation} onChange={next=>{setTargets(next);setDirty(true);}}/>
    {!uncertain&&!conflict&&work.allowedActions.includes('progress')&&<ActivityPhotos work={work} editable={!busy} onRefresh={refresh} onPending={setPhotoPending}/>}
    {error&&<p role="alert" className="text-action-danger">{error}</p>}
    {conflict&&<div className="space-y-2"><p>Hay cambios guardados por otra persona. Tu borrador se conserva. Consulta la versión actual antes de volver a guardarlo.</p>
      <Button variant="secondary" onClick={async()=>{try{await adoptCurrent();}catch(e){setError(interventionError(e));}}}>Cargar versión actual y conservar mi borrador</Button></div>}
    {!work.allowedActions.includes('progress')&&<p role="alert">Ya no puedes subir avances a esta actividad. Tu borrador sigue visible.</p>}
    {uncertain&&<p>La respuesta no pudo confirmarse. Reintenta el mismo envío para comprobarlo sin duplicar el avance.</p>}
    {photoPending&&<p role="status">Termina de subir la foto antes de guardar el avance.</p>}
    <div className="flex flex-wrap gap-3"><Button loading={busy} disabled={conflict||photoPending||!work.allowedActions.includes('progress')} onClick={()=>void submit()}>{uncertain?'Reintentar el mismo avance':'Guardar avance'}</Button>
      <Button variant="secondary" disabled={busy} onClick={()=>guard.confirm(onClose)}>Cerrar sin guardar</Button></div>
    {guard.dialog}
  </section>;
}
