'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui';
import { Map3DView } from '@/components/map3d/Map3DView';
import { MapAttribution } from '@/components/map3d/MapAttribution';
import type { Viewer } from '@/components/map3d/viewer/createViewer';
import { useMapLayers } from '@/hooks/useMapLayers';
import type { CampusOptions, InterventionLocation } from '@/lib/interventions-api';
import { campusScene, targetOf, type CampusTarget } from './campusSelection';

export function InterventionCampusMap({options,selected,disabled,onToggle,onAddSpecimen,focus}: {
  options:CampusOptions;selected:InterventionLocation[];disabled:boolean;
  onToggle:(target:CampusTarget)=>void;onAddSpecimen:(id:number)=>void;focus:InterventionLocation|null;
}) {
  const layers=useMapLayers();const viewer=useRef<Viewer|null>(null);
  const [unsupported,setUnsupported]=useState(false);const [notice,setNotice]=useState('');
  const mapContainer=useRef<HTMLDivElement|null>(null);
  const [brushPosition,setBrushPosition]=useState<{x:number;y:number}|null>(null);
  const brushActive=useRef(false);
  const brushHintTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const [brushHintVisible,setBrushHintVisible]=useState(false);
  useEffect(()=>()=>{if(brushHintTimer.current)clearTimeout(brushHintTimer.current);},[]);
  const scene=useMemo(()=>{if(!layers.data)return null;try{return campusScene(layers.data,options);}catch{return null;}},[layers.data,options]);
  const areas=useMemo(()=>options.zones.filter(z=>selected.some(l=>l.zoneId===z.id)).map(z=>z.code),[options,selected]);
  const specimens=useMemo(()=>options.specimens.filter(s=>selected.some(l=>l.zoneId===null&&l.elementIds.includes(s.id))).map(s=>s.code),[options,selected]);
  const locate=(l:InterventionLocation|null)=>{
    if(!l)return;const t=targetOf(l);const item=t.kind==='area'?options.zones.find(z=>z.id===t.id):options.specimens.find(s=>s.id===t.id);
    if(item)viewer.current?.focusLatLon(item.point.latitude,item.point.longitude);
  };
  useEffect(()=>{viewer.current?.setMarkedSections(areas);viewer.current?.setMarkedSpecimens?.(specimens);},[areas,specimens]);
  useEffect(()=>{locate(focus);},[focus]); // eslint-disable-line react-hooks/exhaustive-deps
  if(unsupported||layers.errorMessage||(!layers.isLoading&&!scene))return <p role="alert">El mapa no está disponible. Recarga la página o usa un navegador con WebGL.</p>;
  if(!scene)return <p role="status">Cargando mapa del campus…</p>;
  return <div className="space-y-2">
    <div className="flex flex-wrap gap-2"><Button variant="secondary" size="sm" onClick={()=>viewer.current?.fit()}>Ver campus</Button><Button variant="secondary" size="sm" onClick={()=>viewer.current?.top()}>Vista superior</Button></div>
    <p className="text-sm text-neutral-600">Pulsa áreas verdes o ejemplares para seleccionarlos. Vuelve a pulsarlos para retirarlos. Lo seleccionado se resalta en celeste.</p>
    <p className="text-xs text-neutral-600">Mantén pulsado un ejemplar 2 segundos y arrastra sobre otros para seleccionarlos.</p>
    <div ref={mapContainer} className="relative h-96 overflow-hidden rounded-lg border border-neutral-200" aria-label="Mapa de selección de áreas verdes y ejemplares">
      <Map3DView data={scene} onReady={v=>{viewer.current=v;v.setEligibleSections?.(options.zones.map(z=>z.code));v.setMarkedSections(areas);v.setMarkedSpecimens?.(specimens);v.setLayerVisible('vegetation',true);v.setLayerVisible('reserve',false);v.setLayerVisible('supervision',false);locate(focus);}}
        onUnsupported={()=>setUnsupported(true)} onHover={()=>undefined} onCompass={()=>undefined} onGroundPick={()=>undefined}
        specimenSweep={{
          enabled:()=>!disabled,
          onSelect:target=>{
            if(disabled||target.layer!=='vegetation')return;
            const code=scene.vegetation[target.index]?.props.code;const specimen=options.specimens.find(s=>s.code===code);
            if(specimen)onAddSpecimen(specimen.id);
          },
          onState:position=>{
            if(!position){
              brushActive.current=false;
              if(brushHintTimer.current)clearTimeout(brushHintTimer.current);
              brushHintTimer.current=null;setBrushHintVisible(false);setBrushPosition(null);return;
            }
            if(!brushActive.current){
              brushActive.current=true;setBrushHintVisible(true);
              brushHintTimer.current=setTimeout(()=>{setBrushHintVisible(false);brushHintTimer.current=null;},3000);
            }
            const rect=mapContainer.current?.getBoundingClientRect();
            if(rect)setBrushPosition({x:Math.max(50,Math.min(rect.width-50,position.clientX-rect.left)),y:Math.max(42,Math.min(rect.height,position.clientY-rect.top))});
          },
        }}
        onSelect={target=>{
          viewer.current?.select(null,false);viewer.current?.clearPin?.();if(!target||disabled)return;
          if(target.layer==='greenAreas'||target.layer==='xerophytic') {
            const code=scene[target.layer][target.index]?.props.code;const z=options.zones.find(z=>z.code===code);
            if(z){onToggle({kind:'area',id:z.id});setNotice('');}else setNotice('Esta área no está disponible para planificar.');
          } else if(target.layer==='vegetation') {
            const code=scene.vegetation[target.index]?.props.code;const s=options.specimens.find(s=>s.code===code);
            if(s){onToggle({kind:'specimen',id:s.id});setNotice('');}
          } else setNotice('Selecciona un área verde o un ejemplar. Los edificios son solo referencia.');
        }}/>
      <div className="absolute bottom-1 left-1"><MapAttribution required/></div>
      {brushPosition&&brushHintVisible&&<div role="status" className="pointer-events-none absolute z-10 inline-flex -translate-x-1/2 -translate-y-full items-center gap-2 rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm font-semibold text-neutral-900 shadow-xs" style={{left:brushPosition.x,top:brushPosition.y-8}}>
        <span aria-hidden="true">✊</span> Arrastra
      </div>}
    </div>
    {notice&&<p role="status" className="text-sm">{notice}</p>}
  </div>;
}
