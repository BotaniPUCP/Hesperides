'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui';
import { Map3DView } from '@/components/map3d/Map3DView';
import { MapAttribution } from '@/components/map3d/MapAttribution';
import type { Viewer } from '@/components/map3d/viewer/createViewer';
import { useMapLayers } from '@/hooks/useMapLayers';
import type { InterventionOptions, InterventionZoneOptions } from '@/lib/interventions-api';
import { placesApi } from '@/lib/places-api';
import { useRequest } from '@/hooks/useRequest';
import { projectOutline, selectionScene } from './zoneSelection';

export function InterventionZoneMap({options,places,selectedIds,disabledIds,onToggle,onPlace}: {
  options:InterventionZoneOptions;places:InterventionOptions['places'];selectedIds:number[];disabledIds:ReadonlySet<number>;onToggle:(id:number)=>void;onPlace:(id:number)=>void;
}) {
  const layers=useMapLayers();
  const catalog=useRequest('intervention-map-places',()=>placesApi.map());
  const [unsupported,setUnsupported]=useState(false);
  const [notice,setNotice]=useState('');
  const viewer=useRef<Viewer|null>(null);
  const scene=useMemo(()=>{
    if(!layers.data)return null;
    try{return selectionScene(layers.data,options);}catch{return null;}
  },[layers.data,options]);
  const marked=options.zones.filter(z=>selectedIds.includes(z.id)).map(z=>z.code);
  useEffect(()=>{viewer.current?.setMarkedSections(marked);},[marked]);
  const focus=()=>{
    if(scene && options.place.geometry)viewer.current?.setReferenceOutline?.(projectOutline(options.place.geometry,scene.plane),true);
  };
  if(unsupported || layers.errorMessage || (!layers.isLoading&&!scene))return <p role="status" className="text-sm text-neutral-600">El mapa no está disponible. Recarga la página o usa un navegador con WebGL para seleccionar las áreas.</p>;
  if(!scene)return <p role="status" className="text-sm text-neutral-600">Cargando mapa…</p>;
  return <div className="space-y-2">
    <div className="flex flex-wrap gap-2"><Button size="sm" variant="secondary" onClick={focus}>Centrar lugar</Button>
      <Button size="sm" variant="secondary" onClick={()=>viewer.current?.top()}>Vista superior</Button>
      <span className="self-center text-xs text-neutral-600">Contorno resaltado: {options.place.name}. Zonas marcadas en celeste.</span></div>
    <div className="relative h-80 overflow-hidden rounded-lg border border-neutral-200" aria-label={`Mapa de zonas de ${options.place.name}`}>
      <Map3DView data={scene} onReady={v=>{
        viewer.current=v;v.setEligibleSections?.(options.zones.map(z=>z.code));v.setMarkedSections(marked);
        v.setLayerVisible('vegetation',false);v.setLayerVisible('reserve',false);v.setLayerVisible('supervision',false);
        if(options.place.geometry)v.setReferenceOutline?.(projectOutline(options.place.geometry,scene.plane),true);
      }} onUnsupported={()=>setUnsupported(true)} onHover={()=>undefined} onCompass={()=>undefined} onGroundPick={()=>undefined}
        onSelect={target=>{
          viewer.current?.select(null,false);viewer.current?.clearPin?.();
          if(!target)return;
          if(target.layer==='campusBuildings') {
            if(!catalog.data){setNotice(catalog.loading?'Cargando lugares. Vuelve a pulsar el edificio en un momento.':'No se pudieron consultar los lugares. Puedes cambiarlo desde el desplegable.');return;}
            const buildingId=scene.campusBuildings[target.index]?.props.id;
            const matches=catalog.data.places.filter(p=>p.buildingIds.includes(buildingId)).flatMap(p=>places.filter(choice=>choice.code===p.code));
            const ids=[...new Set(matches.map(p=>p.id))];
            if(ids.length!==1){setNotice(ids.length?'Este edificio corresponde a varios lugares. Elige el lugar en el desplegable.':'Este edificio todavía no está registrado como lugar. Debe registrarse en Lugares antes de programar una actividad allí.');return;}
            setNotice('');onPlace(ids[0]);return;
          }
          if(target.layer!=='greenAreas'&&target.layer!=='xerophytic') {setNotice('Selecciona un área verde completa o pulsa un edificio para cambiar de lugar. Los árboles son solo referencia.');return;}
          const code=scene[target.layer][target.index]?.props.code;
          const zone=options.zones.find(z=>z.code===code);
          if(!zone){setNotice('Esta zona no está asociada al lugar elegido y no puede seleccionarse.');return;}
          if(disabledIds.has(zone.id)&&!selectedIds.includes(zone.id)){setNotice('Esta zona ya está seleccionada en otro lugar de la actividad.');return;}
          setNotice('');onToggle(zone.id);
        }}/>
      <div className="absolute bottom-1 left-1"><MapAttribution required/></div>
    </div>
    {layers.stale&&<p role="status" className="text-xs text-neutral-600">El contexto del mapa es una copia local. Las zonas seleccionables se verifican con el servidor.</p>}
    {notice&&<p role="status" className="text-sm text-alert-warning-fg">{notice}</p>}
  </div>;
}
