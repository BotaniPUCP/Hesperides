'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui';
import { Map3DView } from '@/components/map3d/Map3DView';
import { MapAttribution } from '@/components/map3d/MapAttribution';
import type { Target } from '@/components/map3d/target';
import { useCtrlRectangle, type RectangleAction, type ScreenRect } from '@/components/map3d/useCtrlRectangle';
import type { Viewer } from '@/components/map3d/viewer/createViewer';
import { useMapLayers } from '@/hooks/useMapLayers';
import type { ActivityTargetStatus, CampusOptions, InterventionLocation } from '@/lib/interventions-api';
import { TARGET_STATES } from './activityProgress';
import { campusScene, targetOf, type CampusTarget } from './campusSelection';
import { useSweepHint } from '@/components/map3d/useSweepHint';

interface Props {
  progressStates?: Record<string,ActivityTargetStatus>; readOnly?:boolean;
  options: CampusOptions; selected: InterventionLocation[]; disabled: boolean; focus: InterventionLocation | null;
  /** Clic: agrega o quita uno. */
  onToggle: (target: CampusTarget) => void;
  /** Barrido y Ctrl + clic izquierdo: agregan varios, nunca quitan. */
  onAdd: (targets: CampusTarget[]) => void;
  /** Ctrl + clic derecho: quita varios. */
  onRemove: (targets: CampusTarget[]) => void;
}

export function InterventionCampusMap({ options, selected, disabled, focus, onToggle, onAdd, onRemove, progressStates, readOnly=false }: Props) {
  const layers = useMapLayers(); const viewer = useRef<Viewer | null>(null);
  const [unsupported, setUnsupported] = useState(false); const [notice, setNotice] = useState('');
  const [fallbackSearch,setFallbackSearch]=useState('');
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const hint = useSweepHint(mapContainer);
  const scene = useMemo(() => { if (!layers.data) return null; try { return campusScene(layers.data, options); } catch (error) { console.error('No se pudo preparar la escena del campus.', error); return null; } }, [layers.data, options]);
  const areas = useMemo(() => options.zones.filter((z) => selected.some((l) => l.zoneId === z.id)).map((z) => z.code), [options, selected]);
  const specimens = useMemo(() => options.specimens.filter((s) => selected.some((l) => l.zoneId === null && l.elementIds.includes(s.id))).map((s) => s.code), [options, selected]);
  const marks=useMemo(()=>progressStates?{
    sections:options.zones.map(z=>({code:z.code,color:TARGET_STATES[progressStates[`area:${z.id}`]??'NOT_STARTED'].color})),
    specimens:options.specimens.map(s=>({code:s.code,color:TARGET_STATES[progressStates[`specimen:${s.id}`]??'NOT_STARTED'].color})),
    badges:[...options.zones.map(z=>({key:`area:${z.id}`,lat:z.point.latitude,lon:z.point.longitude,text:TARGET_STATES[progressStates[`area:${z.id}`]??'NOT_STARTED'].symbol})),
      ...options.specimens.map(s=>({key:`specimen:${s.id}`,lat:s.point.latitude,lon:s.point.longitude,height:(s.heightM??3)+1,text:TARGET_STATES[progressStates[`specimen:${s.id}`]??'NOT_STARTED'].symbol}))],
  }:null,[options,progressStates]);

  /** Lo que hay bajo un objetivo del visor, si es un jardín o un ejemplar del inventario. */
  const campusTargetOf = (target: Target): CampusTarget | null => {
    if (!scene) return null;
    const layer = target.layer;
    if (layer === 'greenAreas' || layer === 'xerophytic') {
      const code = scene[layer][target.index]?.props.code;
      const zone = options.zones.find((z) => z.code === code);
      return zone ? { kind: 'area', id: zone.id } : null;
    }
    if (target.layer === 'vegetation') {
      const specimen = options.specimens.find((s) => s.code === scene.vegetation[target.index]?.props.code);
      return specimen ? { kind: 'specimen', id: specimen.id } : null;
    }
    return null;
  };
  const inRectangle = ({ x1, y1, x2, y2 }: ScreenRect): CampusTarget[] => {
    const v = viewer.current;
    if (!v) return [];
    const zoneCodes = v.sectionCodesInScreenRect(x1, y1, x2, y2, options.zones.map((z) => z.code));
    const specimenCodes = v.specimenCodesInScreenRect(x1, y1, x2, y2, options.specimens.map((s) => s.code));
    return [...options.zones.filter((z) => zoneCodes.includes(z.code)).map((z) => ({ kind: 'area' as const, id: z.id })),
      ...options.specimens.filter((s) => specimenCodes.includes(s.code)).map((s) => ({ kind: 'specimen' as const, id: s.id }))];
  };
  const onRectangle = (rect: ScreenRect, action: RectangleAction) => {
    if (disabled) return;
    const targets = inRectangle(rect);
    if (!targets.length) { setNotice('El rectángulo no encerró jardines ni ejemplares.'); return; }
    setNotice('');
    if (action === 'add') onAdd(targets); else onRemove(targets);
  };
  const ctrl = useCtrlRectangle({ mapRegion: mapContainer, enabled: Boolean(scene) && !unsupported && !disabled, onRectangle });

  const locate = (l: InterventionLocation | null) => {
    if (!l) return; const t = targetOf(l);
    const item = t.kind === 'area' ? options.zones.find((z) => z.id === t.id) : options.specimens.find((s) => s.id === t.id);
    if (item) viewer.current?.focusLatLon(item.point.latitude, item.point.longitude);
  };
  useEffect(() => { viewer.current?.setMarkedSections(areas); viewer.current?.setMarkedSpecimens(specimens); }, [areas, specimens]);
  useEffect(()=>{viewer.current?.setTargetMarks?.(marks??{sections:[],specimens:[],badges:[]});},[marks]);
  useEffect(() => { locate(focus); }, [focus]); // eslint-disable-line react-hooks/exhaustive-deps
  if (unsupported || layers.errorMessage || (!layers.isLoading && !scene)) {
    const choices=[...options.zones.map((z,i)=>({kind:'area' as const,id:z.id,name:/^[A-Z]\s*\d+$/i.test(z.name)?`Jardín ${i+1}`:z.name})),
      ...options.specimens.map(s=>({kind:'specimen' as const,id:s.id,name:s.name}))];
    const found=choices.filter(c=>c.name.toLocaleLowerCase('es').includes(fallbackSearch.toLocaleLowerCase('es')));
    return <div className="space-y-3"><p role="alert">El mapa no está disponible. Puedes continuar desde la lista.</p>
      {unsupported && scene && <Button variant="secondary" onClick={() => { viewer.current=null; setUnsupported(false); }}>Reintentar mapa</Button>}
      {!progressStates&&<><label className="block text-sm">Buscar jardín o ejemplar<input type="search" className="block w-full rounded-md border border-neutral-200 bg-neutral-0 p-3 text-neutral-900" value={fallbackSearch} onChange={e=>setFallbackSearch(e.target.value)}/></label>
        <p className="text-sm">{found.length} resultados. Se muestran hasta 50; busca por nombre para encontrar otros.</p>
        <ul className="max-h-96 overflow-y-auto space-y-2">{found.slice(0,50).map(c=><li key={`${c.kind}:${c.id}`}><label className="flex items-center gap-2 rounded-md border border-neutral-200 p-3"><input type="checkbox" disabled={disabled} checked={selected.some(l=>{const t=targetOf(l);return t.kind===c.kind&&t.id===c.id;})} onChange={()=>onToggle(c)}/>{c.name} · {c.kind==='area'?'Jardín':'Ejemplar'}</label></li>)}</ul>
      </>}
    </div>;
  }
  if (!scene) return <p role="status">Cargando mapa del campus…</p>;
  return <div className="space-y-2">
    <div className="flex flex-wrap gap-2"><Button variant="secondary" size="sm" onClick={() => viewer.current?.fit()}>Ver campus</Button><Button variant="secondary" size="sm" onClick={() => viewer.current?.top()}>Vista superior</Button></div>
    <p className="text-sm text-neutral-600">{progressStates?(readOnly?'El mapa muestra el último avance guardado.':'Pulsa un objetivo para marcarlo terminado o quitar su avance. Para indicar un avance parcial, usa su fila en la lista.'):'Pulsa áreas verdes o ejemplares para seleccionarlos. Vuelve a pulsarlos para retirarlos. Lo seleccionado se resalta en celeste.'}</p>
    {!readOnly&&<p className="text-xs text-neutral-600">Mantén pulsado un jardín o un ejemplar 2 segundos y arrastra: agrega solo de ese tipo. Con Ctrl, clic izquierdo elige varios y clic derecho los quita.</p>}
    <div ref={mapContainer} className="relative h-96 overflow-hidden rounded-lg border border-neutral-200" aria-label="Mapa de selección de áreas verdes y ejemplares">
      <Map3DView data={scene} onReady={(v) => { viewer.current = v; v.setEligibleSections?.(options.zones.map((z) => z.code)); v.setMarkedSections(areas); v.setMarkedSpecimens(specimens); v.setTargetMarks?.(marks??{sections:[],specimens:[],badges:[]}); v.setLayerVisible('vegetation', true); v.setLayerVisible('reserve', false); v.setLayerVisible('supervision', false); if(marks&&!focus)v.focusSections?.(options.zones.map(z=>z.code),options.specimens.map(s=>s.code)); locate(focus); }}
        onUnsupported={() => setUnsupported(true)} onHover={() => undefined} onCompass={() => undefined} onGroundPick={() => undefined}
        selectionSweep={{
          enabled: () => !disabled,
          onSelect: (target) => { const t = disabled ? null : campusTargetOf(target); if (t) onAdd([t]); },
          onState: hint.onState,
        }}
        onSelect={(target) => {
          viewer.current?.select(null, false); viewer.current?.clearPin?.(); if (!target || disabled) return;
          const t = campusTargetOf(target);
          if (t) { onToggle(t); setNotice(''); return; }
          setNotice(target.layer === 'greenAreas' || target.layer === 'xerophytic' ? 'Esta área no está disponible para planificar.'
            : target.layer === 'vegetation' ? '' : 'Selecciona un área verde o un ejemplar. Los edificios son solo referencia.');
        }} />
      {ctrl.layer}
      <div className="absolute bottom-1 left-1"><MapAttribution required /></div>
      {hint.badge}
    </div>
    {notice && <p role="status" className="text-sm">{notice}</p>}
  </div>;
}
