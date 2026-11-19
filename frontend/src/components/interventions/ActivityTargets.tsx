'use client';

import dynamic from 'next/dynamic';
import { useMemo, useRef, useState } from 'react';
import { useRequest } from '@/hooks/useRequest';
import { activitiesApi, type ActivityDetail } from '@/lib/interventions-api';
import type { CampusTarget } from './campusSelection';
import { TARGET_STATES, mapLocation, mapLocations, plannedKeys, plannedMapOptions, progressKey, progressTargetName, type ProgressTarget } from './activityProgress';

const CampusMap=dynamic(()=>import('./InterventionCampusMap').then(m=>m.InterventionCampusMap),{ssr:false,loading:()=><p>Cargando mapa…</p>});
export function ActivityTargets({activity,targets,onChange,disabled=false,showValidation=false}:{activity:ActivityDetail;targets:ProgressTarget[];onChange?:(targets:ProgressTarget[])=>void;disabled?:boolean;showValidation?:boolean}) {
  const inventory=useRequest(`activity-progress-campus:${activity.id}`,()=>activitiesApi.mapOptions(activity.id));
  const [focus,setFocus]=useState<ActivityDetail['targets'][number]|null>(null);
  const mapRegion=useRef<HTMLDivElement>(null);
  const locate=(target:ActivityDetail['targets'][number])=>{
    setFocus({...target});
    mapRegion.current?.scrollIntoView?.({behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});
  };
  const options=useMemo(()=>inventory.data?plannedMapOptions(activity,inventory.data):null,[activity,inventory.data]);
  const mapFocus=useMemo(()=>focus?mapLocation(focus):null,[focus]);
  const states=Object.fromEntries(activity.targets.flatMap(t=>plannedKeys(t).map(key=>[key,targets.find(s=>s.locationId===t.id)?.statusCode??'NOT_STARTED'])));
  const update=(id:number,patch:Partial<ProgressTarget>)=>onChange?.(targets.map(t=>t.locationId===id?{...t,...patch}:t));
  const changeMap=(items:CampusTarget[],mode:'toggle'|'add'|'remove')=>{
    if(disabled||!onChange)return;
    const ids=new Set(activity.targets.filter(t=>items.some(i=>plannedKeys(t).includes(progressKey(i)))).map(t=>t.id));
    onChange(targets.map(t=>!ids.has(t.locationId)?t:mode==='add'&&t.statusCode!=='NOT_STARTED'?t:
      {...t,statusCode:mode==='remove'||(mode==='toggle'&&t.statusCode!=='NOT_STARTED')?'NOT_STARTED':'COMPLETED',partialDescription:null}));
  };
  return <section className="space-y-3" aria-label="Jardines y ejemplares de la actividad">
    <h2 className="text-lg font-semibold">Jardines y ejemplares de la actividad</h2>
    <p className="text-sm">○ Sin avance · ◐ Avance parcial · ✓ Terminado</p>
    <div ref={mapRegion}>{options?<CampusMap options={options} selected={activity.targets.filter(t=>targets.some(s=>s.locationId===t.id&&s.statusCode!=='NOT_STARTED')).flatMap(mapLocations)}
      progressStates={states} disabled={disabled||!onChange} readOnly={!onChange} focus={mapFocus}
      onToggle={t=>changeMap([t],'toggle')} onAdd={t=>changeMap(t,'add')} onRemove={t=>changeMap(t,'remove')}/>:<p role="status">{inventory.loading?'Cargando objetivos en el mapa…':'El mapa no está disponible. Puedes usar la lista para registrar el avance.'}</p>}</div>
    {options&&options.zones.length+options.specimens.length<activity.targets.length&&<p className="text-sm">Algunos objetivos no se pueden ubicar en el mapa. Están disponibles en la lista.</p>}
    <ul className="space-y-3">{activity.targets.map((t,index)=>{
      const state=targets.find(s=>s.locationId===t.id)??{locationId:t.id,statusCode:'NOT_STARTED' as const,partialDescription:null};
      const name=progressTargetName(t,inventory.data,index);const badge=TARGET_STATES[state.statusCode];
      return <li key={t.id} className="rounded-md border border-neutral-200 p-3 space-y-2">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
          <div className="flex min-w-0 items-center gap-3">
          {onChange&&<input type="checkbox" aria-label={name} className="shrink-0" checked={state.statusCode!=='NOT_STARTED'} disabled={disabled}
            onChange={e=>update(t.id,{statusCode:e.target.checked?'COMPLETED':'NOT_STARTED',partialDescription:null})}/>}
          {options?<button type="button" aria-label={`${name}: ver en mapa`} title="Ver en el mapa" className="inline-flex min-w-0 items-start gap-2 rounded-sm text-left text-brand-700 decoration-1 underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-600" onClick={()=>locate(t)}>
            <svg aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg><span className="break-words">{name}</span>
          </button>:<span className="break-words">{name}</span>}
          </div>
          {onChange&&<button type="button" className="rounded-md border border-neutral-200 px-3 py-1 text-sm" aria-pressed={state.statusCode==='PARTIAL'} disabled={disabled||state.statusCode==='NOT_STARTED'}
            onClick={()=>update(t.id,{statusCode:state.statusCode==='PARTIAL'?'COMPLETED':'PARTIAL',partialDescription:null})}>Avance parcial</button>}
          <span className={`col-start-2 row-start-1 justify-self-end whitespace-nowrap rounded-full px-2 py-1 text-sm sm:col-start-3 ${state.statusCode==='COMPLETED'?'bg-status-resolved-bg text-status-resolved-fg':state.statusCode==='PARTIAL'?'bg-alert-warning-bg text-alert-warning-fg':'bg-neutral-100 text-neutral-700'}`}>{badge.symbol} {badge.label}</span>
        </div>
        {plannedKeys(t).length>1&&<p className="text-xs text-neutral-500">Objetivo original con {plannedKeys(t).length} elementos; la marca se aplica al conjunto.</p>}
        {state.statusCode==='PARTIAL'&&(onChange?<div><label className="block text-sm" htmlFor={`partial-description-${t.id}`}>Descripción parcial de {name} <span aria-hidden="true" className="text-action-danger">*</span></label><textarea id={`partial-description-${t.id}`} aria-label={`Descripción parcial de ${name}`} className="min-h-10 rounded-md border border-neutral-200 bg-neutral-0 p-3 text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-brand-600 disabled:bg-neutral-50 disabled:text-neutral-500 mt-1 w-full" value={state.partialDescription??''} maxLength={4000} required disabled={disabled}
          aria-invalid={showValidation&&!state.partialDescription?.trim()} aria-describedby={showValidation&&!state.partialDescription?.trim()?`partial-error-${t.id}`:undefined}
          onChange={e=>update(t.id,{partialDescription:e.target.value})}/>
          {showValidation&&!state.partialDescription?.trim()&&<p id={`partial-error-${t.id}`} className="mt-1 text-sm text-action-danger">Describe el avance parcial de este objetivo.</p>}</div>:<p className="text-sm">{state.partialDescription}</p>)}
      </li>;
    })}</ul>
  </section>;
}
