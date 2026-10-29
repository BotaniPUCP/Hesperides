'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button, Input, Select } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { interventionsApi, interventionError, type InterventionDetail, type InterventionLocation, type InterventionOptions, type InterventionPlanning } from '@/lib/interventions-api';

const blankLocation = (): InterventionLocation => ({ clientReference: crypto.randomUUID(), zoneId:null, placeId:null, location:null, elementIds:[], description:'', unitItemId:null, requestedQuantity:null });
const nullableNumber = (s: string) => s === '' ? null : Number(s);

export function InterventionForm({ initial }: { initial?: InterventionDetail }) {
  const { user } = useAuth();
  const router = useRouter();
  const [options, setOptions] = useState<InterventionOptions | null>(null);
  const [classId, setClassId] = useState(initial?.classItemId ?? 0);
  const [typeId, setTypeId] = useState<number | null>(initial?.typeItemId ?? null);
  const [date, setDate] = useState(initial?.scheduledDate ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [reason, setReason] = useState('');
  const [locations, setLocations] = useState<InterventionLocation[]>(initial?.locations ?? []);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const attempt = useRef<{body:InterventionPlanning; key:string} | null>(null);
  useEffect(() => {
    let active = true;
    interventionsApi.options().then(o => {
      if (active) setOptions(o);
    }).catch(e => { if (active) setError(interventionError(e)); });
    return () => { active = false; };
  }, []);
  const updateLocation = (index: number, patch: Partial<InterventionLocation>) => setLocations(rows => rows.map((row,i) => i === index ? {...row,...patch} : row));
  const catalog = (type: string) => options?.catalogs.filter(c => c.typeCode === type) ?? [];
  const types = catalog('INTERVENTION_TYPE').filter(t => t.parentItemId === classId);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!classId || !date || (types.length > 0 && !typeId) || locations.length === 0) { setError('Selecciona clase, tipo, fecha y al menos una ubicación.'); return; }
    if (locations.some(l => (!l.placeId && !l.zoneId && !l.location && !l.elementIds.length) || (l.location && (!Number.isFinite(l.location.latitude) || !Number.isFinite(l.location.longitude))))) {
      setError('Cada ubicación necesita un lugar o coordenadas válidas.'); return;
    }
    if (locations.some(l => l.requestedQuantity !== null && (!l.unitItemId || l.requestedQuantity < 0))) { setError('La cantidad debe ser positiva o cero y tener una unidad.'); return; }
    const body: InterventionPlanning = {
      ...(initial ? {originItemId:initial.originItemId, reportedByItemId:initial.reportedByItemId, externalCode:initial.externalCode, requestedAt:initial.requestedAt, version:initial.version, rescheduleReason:reason} : {}),
      classItemId:classId, typeItemId:typeId, scheduledDate:date, description, locations,
    };
    setPending(true); setError('');
    try {
      let result: InterventionDetail;
      if (initial) result = await interventionsApi.update(initial.id, body);
      else {
        if (!uncertain) attempt.current = {body, key:crypto.randomUUID()};
        const saved = attempt.current!;
        result = await interventionsApi.create(saved.body, saved.key);
      }
      router.push(`/intervenciones/${result.id}`);
    } catch (e) {
      if (!initial && (!(e instanceof ApiError) || e.status === 0 || e.status >= 500 || e.status === 409)) setUncertain(true);
      setError(interventionError(e));
    } finally { setPending(false); }
  };
  if (!['ADMIN','COORDINADOR'].includes(user?.role.code ?? '')) return <p>No tienes permiso para planificar intervenciones.</p>;
  return <form className="space-y-6" onSubmit={submit}>
    <Link href={initial ? `/intervenciones/${initial.id}` : '/intervenciones'} className="text-brand-600 underline">Volver</Link>
    <h1 className="text-2xl font-bold">{initial ? `Editar ${initial.code}` : 'Nueva intervención'}</h1>
    {error && <p role="alert" className="text-action-danger">{error}</p>}
    {uncertain && <p role="status">No se pudo confirmar el registro. Reintentar enviará exactamente los mismos datos para evitar duplicados. También puedes consultar el listado.</p>}
    <fieldset disabled={pending || uncertain || !options} className="space-y-5 disabled:opacity-70">
      <div className="grid gap-4 sm:grid-cols-2">
        <Select id="work-class" label="Clase" value={String(classId)} options={catalog('INTERVENTION_CLASS').map(c => ({...c,code:String(c.id)}))} onChange={o => {setClassId(o?.id ?? 0);setTypeId(null);}} required />
        <Select id="work-type" label="Tipo" value={typeId === null ? null : String(typeId)} options={types.map(c => ({...c,code:String(c.id)}))} onChange={o => setTypeId(o?.id ?? null)} disabled={!types.length} required={types.length > 0} />
        <label className="grid gap-1 text-sm">Fecha programada<input className="h-11 rounded-md border border-neutral-200 p-2" type="date" required value={date} onChange={e => setDate(e.target.value)} /></label>
        {initial && initial.scheduledDate !== date && <Input id="reschedule-reason" label="Motivo de reprogramación" value={reason} onChange={setReason} maxLength={2000} required />}
      </div>
      <Input id="work-description" label="Descripción del trabajo" value={description} onChange={setDescription} maxLength={4000} />
      <h2 className="text-lg font-semibold">Ubicaciones de esta actividad</h2>
      {locations.map((l,index) => <div key={l.clientReference} className="space-y-4 rounded-lg border border-neutral-200 bg-neutral-0 p-4">
        <div className="flex items-center justify-between"><h3 className="font-semibold">Ubicación {index + 1}</h3><Button variant="ghost" onClick={() => setLocations(rows => rows.filter((_,i) => i !== index))}>Retirar ubicación {index + 1}</Button></div>
        <Select id={`place-${index}`} label="Lugar" value={l.placeId === null ? null : String(l.placeId)} options={(options?.places ?? []).map(p => ({id:p.id,code:String(p.id),label:p.name}))} onChange={o => updateLocation(index,{placeId:o?.id ?? null})} clearable />
        <Select id={`zone-${index}`} label="Sección o sector" value={l.zoneId === null ? null : String(l.zoneId)} options={(options?.zones ?? []).map(p => ({id:p.id,code:String(p.id),label:p.name}))} onChange={o => updateLocation(index,{zoneId:o?.id ?? null})} clearable />
        <Input id={`description-${index}`} label="Referencia de la ubicación" value={l.description ?? ''} onChange={v => updateLocation(index,{description:v})} maxLength={4000} />
        <details open={!l.placeId && !l.zoneId}><summary className="cursor-pointer py-2">Ubicar por coordenadas</summary>
          <div className="grid gap-3 sm:grid-cols-2">{(['latitude','longitude'] as const).map(axis => <label className="grid gap-1 text-sm" key={axis}>{axis === 'latitude' ? 'Latitud' : 'Longitud'}
            <input className="h-11 rounded-md border border-neutral-200 p-2" type="number" step="any" min={axis === 'latitude' ? -90 : -180} max={axis === 'latitude' ? 90 : 180} value={Number.isFinite(l.location?.[axis]) ? l.location?.[axis] : ''}
              onChange={e => {
                const point = {...(l.location ?? {latitude:NaN,longitude:NaN}),[axis]:e.target.value === '' ? NaN : Number(e.target.value)};
                updateLocation(index,{location:Number.isNaN(point.latitude) && Number.isNaN(point.longitude) ? null : point});
              }} /></label>)}</div>
        </details>
        <div className="grid gap-3 sm:grid-cols-2"><Select id={`unit-${index}`} label="Unidad de medida" value={l.unitItemId === null ? null : String(l.unitItemId)} options={catalog('MEASUREMENT_UNIT').map(c => ({...c,code:String(c.id)}))} onChange={o => updateLocation(index,{unitItemId:o?.id ?? null})} clearable />
          <label className="grid gap-1 text-sm">Cantidad solicitada<input className="h-11 rounded-md border border-neutral-200 p-2" type="number" min="0" step="0.001" value={l.requestedQuantity ?? ''} onChange={e => updateLocation(index,{requestedQuantity:nullableNumber(e.target.value)})} /></label></div>
      </div>)}
      <Button variant="secondary" onClick={() => setLocations(rows => [...rows,blankLocation()])}>Agregar ubicación</Button>
    </fieldset>
    <Button type="submit" loading={pending} disabled={!options}>{uncertain ? 'Reintentar registro' : initial ? 'Guardar cambios' : 'Crear intervención'}</Button>
  </form>;
}
