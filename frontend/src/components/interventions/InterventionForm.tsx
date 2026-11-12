'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/hooks/useAuth';
import { Button, Input, Select } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { createClientUuid } from '@/lib/client-uuid';
import { interventionsApi, interventionError, type InterventionDetail, type InterventionOptions, type InterventionPlanning, type InterventionLocation } from '@/lib/interventions-api';
import { incidentsApi } from '@/lib/incidents-api';
import { incidentAfterCreationHref, type IncidentFilters } from '@/lib/incidentNavigation';
import { todayLima } from '@/lib/local-date';
import { useRequest } from '@/hooks/useRequest';
import { useUnsavedChangesGuard } from '@/components/forms/unsaved/useUnsavedChangesGuard';
import { PageHeader } from '@/components/layouts/PageHeader';

import { LegacyInterventionForm } from './LegacyInterventionForm';
import { addCampusSpecimen, campusLocation, campusReady, targetAvailable, targetName, toggleCampus, type CampusTarget } from './campusSelection';
const CampusMap=dynamic(()=>import('./InterventionCampusMap').then(m=>m.InterventionCampusMap),{ssr:false});
type FormProps={initial?:InterventionDetail;fromIncident?:number|null;returnFilters?:IncidentFilters};
export function InterventionForm(props:FormProps) {
 return props.initial&&!props.initial.campusSelectionRevision?<LegacyInterventionForm {...props}/>:<MappedInterventionForm {...props}/>;
}
function MappedInterventionForm({ initial, fromIncident = null, returnFilters = { search:'',status:'',page:0 } }: {
  initial?: InterventionDetail; fromIncident?: number | null; returnFilters?: IncidentFilters;
}) {
  const { user } = useAuth();
  const origin = initial ? null : fromIncident;
  const source = useRequest(origin ? `intervention-origin:${user?.id}:${origin}` : null, () => incidentsApi.detail(origin!));
  const [dirty,setDirty] = useState(false);
  const guard = useUnsavedChangesGuard(dirty);
  const sourceAvailable = !origin || (user?.role.code === 'COORDINADOR' && source.data?.incident.approvedAt != null && source.data.incident.resolvedAt === null);
  const [options, setOptions] = useState<InterventionOptions | null>(null);
  const [classId, setClassId] = useState(initial?.classItemId ?? 0);
  const [typeId, setTypeId] = useState<number | null>(initial?.typeItemId ?? null);
  const [date, setDate] = useState(() => initial?.scheduledDate ?? todayLima());
  const [description, setDescription] = useState(initial?.description ?? '');
  const [reason, setReason] = useState('');
  const [findingSource,setFindingSource] = useState<number | null>(null);
  const [locations,setLocations]=useState<InterventionLocation[]>(initial?.locations??[]);
  const [reload,setReload]=useState(0);
  const inventory=useRequest(`campus-selection:${reload}`,()=>interventionsApi.campusOptions());
  const [confirmedRevision,setConfirmedRevision]=useState(initial?.campusSelectionRevision??null);
  const [expanded,setExpanded]=useState(false);
  const [focus,setFocus]=useState<InterventionLocation|null>(null);
  const selectionReady=!!inventory.data&&campusReady(locations,inventory.data)&&(!initial||confirmedRevision===inventory.data.selectionRevision);
  const selectionChanged=!!inventory.data&&locations.length>0&&((!!initial&&confirmedRevision!==inventory.data.selectionRevision)||locations.some(l=>l.zoneId!==null&&l.zoneSelectionRevision!==inventory.data!.selectionRevision));
  const zoneIds=locations.flatMap(l=>l.zoneId===null?[]:[l.zoneId]);
  const specimenIds=locations.flatMap(l=>l.zoneId===null?l.elementIds:[]);
  const indexed=locations.map((l,index)=>({l,index}));
  const areaRows=indexed.filter(({l})=>l.zoneId!==null);
  const recent=(areaRows.length?areaRows:indexed).slice(-5).reverse();
  const previewKey=selectionReady?JSON.stringify([inventory.data!.selectionRevision,zoneIds,specimenIds]):null;
  const [settledPreviewKey,setSettledPreviewKey]=useState<string|null>(null);
  useEffect(()=>{
    const timer=setTimeout(()=>setSettledPreviewKey(previewKey),180);
    return ()=>clearTimeout(timer);
  },[previewKey]);
  const previewWaiting=previewKey!==null&&previewKey!==settledPreviewKey;
  const preview=useRequest(!previewWaiting?previewKey:null,
    ()=>interventionsApi.campusPreview(inventory.data!.selectionRevision,zoneIds,specimenIds));
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const attempt = useRef<{body:InterventionPlanning; key:string} | null>(null);
  useEffect(() => {
    let active = true;
    interventionsApi.options().then(o => {
      if (active) {
        setOptions(o);
        setClassId(selected => selected || o.catalogs.find(c => c.typeCode === 'INTERVENTION_CLASS')?.id || 0);
      }
    }).catch(e => { if (active) setError(interventionError(e)); });
    return () => { active = false; };
  }, []);
  const toggle=(target:CampusTarget)=>{
    if(!inventory.data||pending||uncertain||!sourceAvailable)return;
    try {setLocations(rows=>toggleCampus(rows,target,inventory.data!));setDirty(true);setError('');}
    catch {setError('No se pudo seleccionar. Actualiza el navegador y vuelve a intentarlo.');}
  };
  const catalog = (type: string) => options?.catalogs.filter(c => c.typeCode === type) ?? [];
  const types = catalog('INTERVENTION_TYPE').filter(t => t.parentItemId === classId);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!initial && !uncertain && date && date < todayLima()) {
      setError('La fecha programada debe ser hoy o una fecha futura.'); return;
    }
    const findingOrigin=options?.catalogs.find(c => c.typeCode === 'INTERVENTION_ORIGIN' && c.code === 'FINDING');
    if (origin && (!findingSource || !findingOrigin)) { setError('Selecciona la clasificación de origen del reporte.'); return; }
    if (!classId || !date || (types.length > 0 && !typeId) || locations.length === 0) { setError('Selecciona clase, tipo, fecha y al menos una ubicación.'); return; }
    if (!uncertain && (!selectionReady || !preview.data || preview.errorMessage)) {setError('Selecciona áreas o ejemplares y espera la verificación de superficie.');return;}
    const body: InterventionPlanning = {
      ...(initial ? {originItemId:initial.originItemId, reportedByItemId:initial.reportedByItemId, externalCode:initial.externalCode, requestedAt:initial.requestedAt, version:initial.version, rescheduleReason:reason} : {}),
      ...(origin ? {originItemId:findingOrigin!.id,reportedByItemId:findingSource!} : {}),
      classItemId:classId, typeItemId:typeId, scheduledDate:date, description, locations:locations.map(campusLocation),campusSelectionRevision:inventory.data!.selectionRevision,
    };
    setPending(true); setError('');
    let requestSent = false;
    try {
      let result: InterventionDetail;
      if (initial) result = await interventionsApi.update(initial.id, body);
      else {
        if (!uncertain) attempt.current = {body, key:createClientUuid()};
        const saved = attempt.current!;
        requestSent = true;
        result = await interventionsApi.create(saved.body, saved.key);
      }
      guard.navigate(origin ? incidentAfterCreationHref(origin,result.id,returnFilters) : `/intervenciones/${result.id}`);
    } catch (e) {
      if (!initial && requestSent && (!(e instanceof ApiError) || e.status === 0 || e.status >= 500 || (e.status === 409 && !/zone|spatial|campus/i.test(e.message)))) setUncertain(true);
      setError(interventionError(e));
    } finally { setPending(false); }
  };
  if (!['ADMIN','COORDINADOR'].includes(user?.role.code ?? '')) return <p>No tienes permiso para planificar intervenciones.</p>;
  return <div className="space-y-6"><PageHeader title={initial ? `Editar ${initial.activityTitle || 'actividad'}` : 'Nueva intervención'} />
  <form className="surface-card space-y-6" onChange={() => setDirty(true)} onSubmit={submit}>
    {guard.dialog}
    {origin && <Link href={incidentAfterCreationHref(origin,null,returnFilters)} className="text-brand-600 underline">Volver a la incidencia</Link>}
    {origin && <p className="text-sm text-neutral-700">Origen: {source.data?.incident.officialCode ?? `incidencia #${origin}`}. Al guardar volverás para confirmar el vínculo; todavía no se crea una asociación.</p>}
    {origin && !sourceAvailable && <p role="alert" className="text-sm text-action-danger">{source.loading ? 'Verificando la incidencia de origen…' : source.errorMessage ?? 'La incidencia debe estar registrada, abierta y disponible para tu cuenta.'}</p>}
    {error && <p role="alert" className="text-action-danger">{error}</p>}
    {uncertain && <p role="status">No se pudo confirmar el registro. Reintentar enviará exactamente los mismos datos para evitar duplicados. También puedes consultar el listado.</p>}
    <fieldset disabled={pending || uncertain || !options || !sourceAvailable} className="space-y-5 disabled:opacity-70">
      {origin && <Select id="finding-source" label="Clasificación de origen del reporte" required value={findingSource?.toString() ?? null}
        options={catalog('INCIDENT_SOURCE').map(c => ({...c,code:String(c.id)}))} onChange={o => setFindingSource(o?.id ?? null)}
        helperText="La actividad se registra como hallazgo. Esta clasificación es distinta del nombre de quien envió la incidencia." />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Select id="work-class" label="Clase" value={String(classId)} options={catalog('INTERVENTION_CLASS').map(c => ({...c,code:String(c.id)}))} onChange={o => {setClassId(o?.id ?? 0);setTypeId(null);}} required />
        <Select id="work-type" label="Tipo" value={typeId === null ? null : String(typeId)} options={types.map(c => ({...c,code:String(c.id)}))} onChange={o => setTypeId(o?.id ?? null)} disabled={!types.length} required={types.length > 0} />
        <label className="grid gap-1 text-sm">Fecha programada<input className="h-11 rounded-md border border-neutral-200 p-2" type="date" min={initial ? undefined : todayLima()} required value={date} onChange={e => setDate(e.target.value)} /></label>
        {initial && initial.scheduledDate !== date && <Input id="reschedule-reason" label="Motivo de reprogramación" value={reason} onChange={setReason} maxLength={2000} required />}
      </div>
      <Input id="work-description" label="Descripción del trabajo" value={description} onChange={setDescription} maxLength={4000} />
      <h2 className="text-lg font-semibold">Áreas verdes y ejemplares</h2>
      <Button variant="secondary" onClick={()=>setReload(n=>n+1)}>Actualizar mapa</Button>
      {inventory.loading&&<p role="status">Consultando áreas y ejemplares...</p>}
      {inventory.errorMessage&&<p role="alert">{inventory.errorMessage}</p>}
      {inventory.data&&<>
        <CampusMap options={inventory.data} selected={locations} disabled={pending||uncertain||!sourceAvailable} onToggle={toggle} onAddSpecimen={id=>{
          if(pending||uncertain||!sourceAvailable)return;
          setLocations(rows=>addCampusSpecimen(rows,id,inventory.data!));setDirty(true);
        }} focus={focus}/>
        <p role="status" aria-live="polite" className="text-sm text-neutral-600">{zoneIds.length} {zoneIds.length===1?'jardín':'jardines'} y {specimenIds.length} {specimenIds.length===1?'ejemplar seleccionado':'ejemplares seleccionados'}</p>
        <div role="status" className="rounded-md border border-neutral-200 p-3">
          Superficie seleccionada: {selectionReady&&preview.data?`${preview.data.surfaceM2.toLocaleString('es-PE',{maximumFractionDigits:2})} m²`:previewWaiting||preview.loading?'Verificando...':'Selecciona jardines o ejemplares.'}
          <p className="text-sm text-neutral-600">Superficie de los jardines seleccionados, sin duplicar superposiciones. Los ejemplares elegidos individualmente se contabilizan aparte.</p>
        </div>
        {preview.errorMessage&&<p role="alert">{preview.errorMessage} Actualiza el mapa y revisa la selección.</p>}
        {selectionChanged&&<div role="alert"><p>El inventario cambió. Revisa y confirma tu selección antes de guardar.</p><Button variant="secondary" onClick={()=>{
          setConfirmedRevision(inventory.data!.selectionRevision);setLocations(rows=>rows.map(l=>l.zoneId===null?l:{...l,zoneSelectionRevision:inventory.data!.selectionRevision}));setDirty(true);
        }}>Confirmar selección actual</Button></div>}
        {locations.length>0&&<section aria-label="Selección actual" className="space-y-2">
          <h3 className="font-medium">{expanded?'Todo lo seleccionado':areaRows.length?'Últimas áreas seleccionadas':'Últimos ejemplares seleccionados'}</h3>
          {(expanded?indexed:recent).map(({l,index})=><div key={l.clientReference} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-neutral-200 p-3">
            <span>{targetName(l,inventory.data!,index)} <span className="text-sm text-neutral-600">{l.zoneId===null?'· Ejemplar':'· Área verde'}</span>{!targetAvailable(l,inventory.data!)&&<span className="text-action-danger"> · Ya no está disponible; retírala de la selección.</span>}</span>
            <div className="flex gap-2"><Button variant="ghost" size="sm" onClick={()=>setFocus({...l})}>Ver en mapa</Button><Button variant="ghost" size="sm" onClick={()=>{setLocations(rows=>rows.filter(r=>r.clientReference!==l.clientReference));setDirty(true);}}>Retirar</Button></div>
          </div>)}
          {locations.length>recent.length&&<Button variant="secondary" onClick={()=>setExpanded(v=>!v)}>{expanded?'Mostrar menos':'Mostrar más'}</Button>}
        </section>}
      </>}
    </fieldset>
    <Button type="submit" loading={pending} disabled={!options || !sourceAvailable || (!uncertain && (!selectionReady || !preview.data))}>{uncertain ? 'Reintentar registro' : initial ? 'Guardar cambios' : origin ? 'Guardar y volver a la incidencia' : 'Crear intervención'}</Button>
  </form></div>;
}
