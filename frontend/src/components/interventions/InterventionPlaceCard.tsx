'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { Button, Select } from '@/components/ui';
import { useRequest } from '@/hooks/useRequest';
import { interventionsApi, type InterventionOptions, type InterventionZoneOptions } from '@/lib/interventions-api';
import type { PlaceDraft } from './zoneSelection';

const ZoneMap=dynamic(()=>import('./InterventionZoneMap').then(m=>m.InterventionZoneMap),{ssr:false});

export function InterventionPlaceCard({card,index,places,active,disabledIds,onPlace,onToggle,onRemove,onActivate,onOptions,onConfirm}: {
  card:PlaceDraft;index:number;places:InterventionOptions['places'];active:boolean;disabledIds:ReadonlySet<number>;
  onPlace:(id:number|null)=>void;onToggle:(id:number,options:InterventionZoneOptions)=>void;onRemove:()=>void;onActivate:()=>void;
  onOptions:(key:string,options:InterventionZoneOptions|null)=>void;onConfirm:(options:InterventionZoneOptions)=>void;
}) {
  const [reload,setReload]=useState(0);
  const request=useRequest(card.placeId===null?null:`zones:${card.key}:${card.placeId}:${reload}`,()=>interventionsApi.zoneOptions(card.placeId!));
  const options=request.data;
  useEffect(()=>{onOptions(card.key,options);},[card.key,options,onOptions]);
  const missing=options?card.locations.filter(l=>!options.zones.some(z=>z.id===l.zoneId)):[];
  const changed=options?.current&&card.locations.some(l=>l.zoneSelectionRevision!==options.selectionRevision);
  return <section className="space-y-4 rounded-lg border border-neutral-200 bg-neutral-0 p-4">
    <div className="flex items-center justify-between gap-3"><h3 className="font-semibold">Lugar {index+1}</h3><Button variant="ghost" onClick={onRemove}>Retirar lugar {index+1}</Button></div>
    <Select id={`place-${index}`} label="Lugar" value={card.placeId===null?null:String(card.placeId)} options={places.map(p=>({id:p.id,code:String(p.id),label:p.name}))} onChange={o=>onPlace(o?.id??null)} clearable />
    {request.loading&&<p role="status">Consultando zonas del lugar…</p>}
    {request.errorMessage&&<p role="alert">{request.errorMessage}</p>}
    {request.notFound&&<p role="alert">Este lugar ya no está disponible. Selecciona otro lugar.</p>}
    {card.placeId!==null&&<Button variant="secondary" size="sm" onClick={()=>setReload(n=>n+1)}>Actualizar zonas</Button>}
    {options&&!options.current&&<p role="alert">Las zonas de este lugar necesitan una revisión de sus asociaciones antes de poder seleccionarse.</p>}
    {options&&<>
      {active?<ZoneMap key={card.placeId} options={options} places={places} selectedIds={card.locations.flatMap(l=>l.zoneId===null?[]:[l.zoneId])} disabledIds={disabledIds} onToggle={id=>onToggle(id,options)} onPlace={id=>{if(id!==card.placeId)onPlace(id);}}/>:<Button variant="secondary" onClick={onActivate}>Mostrar mapa de este lugar</Button>}
      <p role="status" aria-live="polite" className="text-sm text-neutral-600">{card.locations.length} {card.locations.length===1?'área seleccionada':'áreas seleccionadas'}</p>
    </>}
    {options?.current&&<>
      {!options.zones.length&&<p>No hay zonas habilitadas para este lugar.</p>}
      {changed&&!missing.length&&<div role="status"><p>Las asociaciones cambiaron desde que se guardó esta selección. Confirma las zonas antes de guardar.</p><Button variant="secondary" onClick={()=>onConfirm(options)}>Confirmar selección actual</Button></div>}
    </>}
    {missing.length>0&&<div role="alert"><p>Hay {missing.length} {missing.length===1?'área que ya no está habilitada':'áreas que ya no están habilitadas'} para este lugar.</p><Button variant="secondary" onClick={()=>{for(const l of missing)onToggle(l.zoneId!,options!);}}>Retirar áreas no disponibles</Button></div>}
  </section>;
}
