'use client';

import { useEffect, useRef, useState } from 'react';
import { Button, Modal } from '@/components/ui';
import { useCatalog } from '@/hooks/useCatalog';
import { useAuth } from '@/hooks/useAuth';
import { activitiesApi, interventionError, type ActivityDetail } from '@/lib/interventions-api';
import { ApiError } from '@/lib/api';
import { createClientUuid } from '@/lib/client-uuid';
import { LIMITES, motivoDeRechazo } from '@/lib/upload-limits';
import { progressTargetName } from './activityProgress';

export function ActivityPhotos({work,onRefresh,editable=false,onPending}:{work:ActivityDetail;onRefresh:()=>Promise<void>;editable?:boolean;onPending?:(pending:boolean)=>void}) {
  const {user}=useAuth();const moments=useCatalog('EVIDENCE_MOMENT');
  const [file,setFile]=useState<File|null>(null);const [caption,setCaption]=useState('');
  const [location,setLocation]=useState('');const [moment,setMoment]=useState('UNSPECIFIED');
  const [recover,setRecover]=useState('');const [busy,setBusy]=useState(false);const [pending,setPending]=useState(false);
  const [error,setError]=useState('');const [photo,setPhoto]=useState<{url:string;caption:string}|null>(null);
  const [formOpen,setFormOpen]=useState(false);const [showAll,setShowAll]=useState(false);const [showValidation,setShowValidation]=useState(false);
  const input=useRef<HTMLInputElement>(null);
  const attempt=useRef<{file:File;body:Parameters<typeof activitiesApi.announce>[1];id?:number}|null>(null);
  useEffect(()=>()=>{if(photo)URL.revokeObjectURL(photo.url);},[photo]);
  const markPending=(value:boolean)=>{setPending(value);onPending?.(value);};
  const closeForm=()=>{
    if(busy)return;
    if(!pending){setFile(null);setCaption('');setRecover('');setLocation('');setMoment('UNSPECIFIED');setError('');setShowValidation(false);onPending?.(false);}
    setFormOpen(false);
  };
  const upload=async()=>{
    if(busy)return;
    setShowValidation(true);
    if(!attempt.current){
      if(!file){setError('Selecciona una foto.');return;}
      const rejection=motivoDeRechazo(file,LIMITES.foto);
      if(rejection||!['image/jpeg','image/png','image/webp'].includes(file.type)){setError(rejection??'Selecciona una foto JPEG, PNG o WebP.');return;}
      if(!recover&&!moments.items.some(m=>m.code===moment)){setError('Espera a que carguen los momentos de la foto.');return;}
      attempt.current={file,id:recover?Number(recover):undefined,body:{version:work.version,clientReference:createClientUuid(),locationId:location?Number(location):null,caption,momentCode:moment}};
    }
    setBusy(true);markPending(true);setError('');
    try {
      const request=attempt.current;
      if(!request.id)request.id=(await activitiesApi.announce(work.id,request.body)).id;
      await activitiesApi.upload(work.id,request.id,request.file);
      await onRefresh();
      attempt.current=null;setFile(null);setCaption('');setRecover('');markPending(false);
      setShowValidation(false);setFormOpen(false);
      if(input.current)input.current.value='';
    }catch(e){
      // Only an explicit version rejection proves that no announcement was made.
      if(e instanceof ApiError&&e.status===409&&e.message==='Activity has changed; reload before retrying'&&!attempt.current?.id){attempt.current=null;markPending(false);await onRefresh().catch(()=>undefined);}
      else if(e instanceof ApiError&&[400,413,415,422].includes(e.status)){
        // A rejected file has not been received; keep its announcement for recovery.
        if(attempt.current?.id)setRecover(String(attempt.current.id));
        attempt.current=null;setFile(null);markPending(false);if(input.current)input.current.value='';
      }
      setError(interventionError(e));
    }finally{setBusy(false);}
  };
  const ownPending=work.evidences.filter(e=>!e.uploadedAt&&e.uploadedByUserId===user?.id);
  const received=work.evidences.filter(e=>e.uploadedAt);
  const visible=showAll?received:received.slice(0,5);
  return <section className="space-y-3" aria-label="Foto de la actividad">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Foto de la actividad</h2>
      {editable&&<Button variant="secondary" size="sm" onClick={()=>{setError('');setFormOpen(true);}}>{pending?'Continuar subida de foto':'Agregar foto'}</Button>}</div>
    {visible.map(e=><div key={e.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-neutral-200 p-3">
      <span>{e.caption||'Foto del trabajo'} · {e.historical||e.progressEntryId?'Incluida en el historial':'Pendiente de guardar con un avance'}</span>
      <Button variant="secondary" size="sm" onClick={async()=>{try{const blob=await activitiesApi.photo(work.id,e.id);setPhoto({url:URL.createObjectURL(blob),caption:e.caption||'Foto del trabajo'});}catch(err){setError(interventionError(err));}}}>Ver foto</Button>
    </div>)}
    {!received.length&&<p className="text-sm">Aún no hay fotos recibidas.</p>}
    {received.length>5&&<Button variant="secondary" size="sm" aria-expanded={showAll} onClick={()=>setShowAll(value=>!value)}>{showAll?'Mostrar menos':'Mostrar más'}</Button>}
    {editable&&<Modal isOpen={formOpen} onClose={closeForm} title="Agregar foto al avance" size="lg" closeOnEsc={!busy} closeOnOverlayClick={!busy}>
      <div className="space-y-4">
      <p className="text-sm text-neutral-600">Los campos marcados con <span className="font-semibold text-action-danger">*</span> son obligatorios.</p>
      <p className="text-sm">Para acreditar un jardín o ejemplar, selecciónalo en «Objetivo de la foto». Las fotos generales no acreditan un objetivo específico. Subir una foto no inicia la actividad.</p>
      <fieldset disabled={busy||pending} className="grid gap-3 sm:grid-cols-2">
        {ownPending.length>0&&<label className="sm:col-span-2">Foto pendiente de recibir<select className="min-h-10 rounded-md border border-neutral-200 bg-neutral-0 p-3 text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-brand-600 disabled:bg-neutral-50 disabled:text-neutral-500 w-full" value={recover} onChange={e=>setRecover(e.target.value)}><option value="">Nueva foto</option>{ownPending.map(e=><option key={e.id} value={e.id}>{e.caption||'Foto pendiente'} · {e.id}</option>)}</select></label>}
        {!recover&&<><label>Objetivo de la foto<select className="min-h-10 rounded-md border border-neutral-200 bg-neutral-0 p-3 text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-brand-600 disabled:bg-neutral-50 disabled:text-neutral-500 w-full" value={location} onChange={e=>setLocation(e.target.value)}><option value="">Foto general</option>{work.targets.map((t,i)=><option key={t.id} value={t.id}>{progressTargetName(t,null,i)}</option>)}</select></label>
          <label>Momento <span aria-hidden="true" className="text-action-danger">*</span><select aria-label="Momento" required className="min-h-10 rounded-md border border-neutral-200 bg-neutral-0 p-3 text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-brand-600 disabled:bg-neutral-50 disabled:text-neutral-500 w-full" value={moment} onChange={e=>setMoment(e.target.value)}>{moments.items.filter(m=>['BEFORE','AFTER','UNSPECIFIED'].includes(m.code)).map(m=><option key={m.code} value={m.code}>{m.label}</option>)}</select></label>
          <label className="sm:col-span-2">Descripción de la foto<input className="min-h-10 rounded-md border border-neutral-200 bg-neutral-0 p-3 text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-brand-600 disabled:bg-neutral-50 disabled:text-neutral-500 w-full" value={caption} onChange={e=>setCaption(e.target.value)} maxLength={255}/></label></>}
      </fieldset>
      <label className="block text-sm">Foto JPEG, PNG o WebP · máximo {LIMITES.foto.etiqueta} <span aria-hidden="true" className="text-action-danger">*</span><input ref={input} type="file" aria-label={`Foto JPEG, PNG o WebP · máximo ${LIMITES.foto.etiqueta}`} required aria-invalid={showValidation&&!file} accept="image/jpeg,image/png,image/webp" disabled={busy||pending} onChange={e=>{setFile(e.target.files?.[0]??null);setError('');onPending?.(!!e.target.files?.length);}} className="block w-full py-2 file:mr-3 file:cursor-pointer file:rounded-md file:border file:border-neutral-200 file:bg-neutral-0 file:px-4 file:py-2 file:text-neutral-900 file:transition-colors hover:file:bg-neutral-100 hover:file:shadow-sm disabled:file:cursor-not-allowed"/></label>
      {pending&&file&&<p className="text-sm">Archivo por confirmar: {file.name}</p>}
      <div className="flex flex-wrap gap-3"><Button variant="secondary" loading={busy} onClick={()=>void upload()}>{pending?'Reintentar subida de foto':'Subir foto'}</Button>
        <Button variant="secondary" disabled={busy} onClick={closeForm}>Cerrar</Button></div>
      {pending&&<p className="text-sm">Se conserva la misma foto para reintentar sin duplicarla.</p>}
      {error&&<p role="alert" className="text-action-danger">{error}</p>}
      </div>
    </Modal>}
    {error&&!formOpen&&<p role="alert" className="text-action-danger">{error}</p>}
    <Modal isOpen={!!photo} onClose={()=>setPhoto(null)} title="Foto de la actividad" size="lg">{photo&&<>
      {/* Private authenticated blob, never an unscoped storage URL. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photo.url} alt={photo.caption} className="max-h-[75vh] w-full object-contain"/>
    </>}</Modal>
  </section>;
}
