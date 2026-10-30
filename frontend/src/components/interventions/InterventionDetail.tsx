'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCatalog } from '@/hooks/useCatalog';
import { Button, Input, LoadingSkeleton, Modal, Select, StatusBadge, useToast } from '@/components/ui';
import { LIMITES, motivoDeRechazo } from '@/lib/upload-limits';
import { interventionsApi, interventionError, type InterventionDetail as Detail, type InterventionEvidence, type InterventionLocation, type InterventionOptions } from '@/lib/interventions-api';
import { InterventionForm } from './InterventionForm';
import { ApiError } from '@/lib/api';
import { createClientUuid } from '@/lib/client-uuid';

const actionLabels: Record<string,string> = {
  start:'Iniciar', execution:'Guardar avance', complete:'Reportar terminada', validate:'Aprobar', observe:'Observar', reopen:'Corregir observación',
};

function EvidenceUpload({ work, location, pendingEvidence, onChange }: { work:Detail; location:InterventionLocation; pendingEvidence?:InterventionEvidence; onChange:()=>Promise<void> }) {
  const moments = useCatalog('EVIDENCE_MOMENT');
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [moment, setMoment] = useState('UNSPECIFIED');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [attempted, setAttempted] = useState(false);
  const attempt = useRef<{reference:string; key:string; version:number; caption:string; moment:string; evidenceId?:number} | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const momentOptions = moments.items.filter(m => ['BEFORE','AFTER','UNSPECIFIED'].includes(m.code));
  const selectedMoment = momentOptions.some(m => m.code === moment) ? moment : momentOptions[0]?.code ?? '';
  const submit = async () => {
    if (!file) { setError('Selecciona una foto.'); return; }
    if (!pendingEvidence && !selectedMoment) { setError(moments.errorMessage ?? 'Espera a que se carguen los momentos de evidencia.'); return; }
    const rejection = motivoDeRechazo(file,LIMITES.foto);
    if (rejection) { setError(rejection); return; }
    setBusy(true); setError(''); setAttempted(true);
    try {
      if (!attempt.current) attempt.current = {reference:createClientUuid(),key:createClientUuid(),version:work.version,caption,moment:selectedMoment,evidenceId:pendingEvidence?.id};
      const saved = attempt.current;
      if (!saved.evidenceId) {
        const announced = await interventionsApi.announce(work.id, location.id!, saved.version, saved.reference, saved.key, saved.caption, saved.moment);
        saved.evidenceId = announced.id;
      }
      await interventionsApi.upload(work.id,saved.evidenceId,file);
      attempt.current = null; setFile(null); setCaption(''); setAttempted(false);
      if (input.current) input.current.value = '';
      await onChange();
    } catch (e) {
      // A version rejection is definitive: no announcement was persisted. A lost
      // response or a busy idempotency lock must retain the original request.
      if (e instanceof ApiError && e.status === 409 && e.message === 'Intervention has changed; reload before retrying') {
        attempt.current = null; setAttempted(false);
      }
      setError(interventionError(e)); await onChange().catch(() => undefined);
    }
    finally { setBusy(false); }
  };
  return <div className="space-y-3 rounded-md border border-neutral-200 p-3">
    <p className="text-sm font-medium">{pendingEvidence ? `Recuperar foto pendiente · intento ${pendingEvidence.attemptNumber}` : 'Agregar foto de esta ubicación'}</p>
    {!pendingEvidence && <fieldset disabled={busy || attempted} className="grid gap-3 sm:grid-cols-2">
      <Input id={`caption-${location.id}`} label="Descripción de la foto" value={caption} onChange={setCaption} maxLength={255} />
      <Select id={`moment-${location.id}`} label="Momento" value={selectedMoment} onChange={o => setMoment(o?.code ?? '')} options={momentOptions.map((m,index) => ({id:index,code:m.code,label:m.label}))} loading={moments.isLoading} />
    </fieldset>}
    <label className="block text-sm">Foto JPEG, PNG o WebP · máximo {LIMITES.foto.etiqueta}
      <input ref={input} className="block min-h-11 w-full py-2" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e => {setFile(e.target.files?.[0] ?? null);setError('');}} />
    </label>
    {error && <p role="alert" className="text-sm text-action-danger">{error}</p>}
    <Button variant="secondary" loading={busy} onClick={submit}>{attempted ? 'Reintentar subida' : 'Subir foto'}</Button>
  </div>;
}

export function InterventionDetail({ id, edit = false }: { id:number; edit?:boolean }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [data, setData] = useState<Detail | null>(null);
  const [options, setOptions] = useState<InterventionOptions | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<{location:InterventionLocation; action:string} | null>(null);
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('');
  const [team, setTeam] = useState('');
  const [assignee, setAssignee] = useState('');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [photo, setPhoto] = useState<{url:string; caption:string} | null>(null);
  const refresh = useCallback(async () => { const next = await interventionsApi.detail(id); setData(next); },[id]);
  useEffect(() => {
    let active = true;
    if (!Number.isSafeInteger(id) || id < 1) return;
    Promise.all([interventionsApi.detail(id),interventionsApi.options()]).then(([d,o]) => {
      if (active) {setData(d);setOptions(o);setError('');}
    }).catch(e => {if (active) setError(interventionError(e));}).finally(() => {if (active) setLoading(false);});
    return () => {active = false;};
  },[id]);
  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo.url); },[photo]);
  const mutate = async (action:()=>Promise<Detail>) => {
    setBusy(true);setError('');
    try {setData(await action());setSelected(null);setCancelOpen(false);setReason('');showToast({variant:'success',title:'Intervención actualizada.'});}
    catch (e) {setError(interventionError(e));}
    finally {setBusy(false);}
  };
  const reload = async () => {setBusy(true);try {await refresh();setError('Datos recargados. Revisa el estado actual antes de reintentar; tu borrador se conserva.');} catch(e){setError(interventionError(e));} finally {setBusy(false);}};
  if (!Number.isSafeInteger(id) || id < 1) return <p role="alert">Intervención no válida.</p>;
  if (loading) return <LoadingSkeleton variant="card" />;
  if (!data) return <div role="alert">{error}<Link href="/intervenciones">Volver al listado</Link></div>;
  if (edit) return data.startedAt || data.planningStatusCode === 'CANCELLED'
    ? <p>La planificación está cerrada. <Link href={`/intervenciones/${id}`}>Volver al detalle</Link></p>
    : <InterventionForm initial={data} />;
  const role = user?.role.code ?? '';
  const canPlan = ['ADMIN','COORDINADOR'].includes(role) && !data.startedAt && data.planningStatusCode !== 'CANCELLED';
  const canAssign = ['COORDINADOR','SUPERVISOR'].includes(role) && !data.startedAt && data.planningStatusCode !== 'CANCELLED';
  const teamOption = options?.teams.find(t => String(t.id) === team);
  const label = (type:string,code:string) => options?.catalogs.find(c => c.typeCode === type && c.code === code)?.label ?? code;
  const unit = (id:number|null|undefined) => options?.catalogs.find(c => c.id === id)?.label ?? '';
  const openAction = (location:InterventionLocation,action:string) => {setSelected({location,action});setQuantity(String(location.progressQuantity ?? location.executedQuantity ?? ''));setNotes(location.executionNotes ?? '');setReason('');setError('');};
  const submitAction = () => {
    if (!selected) return;
    const body:Record<string,unknown> = {version:data.version};
    if (selected.action === 'execution') {body.progressQuantity=quantity === '' ? null : Number(quantity);body.executionNotes=notes;}
    if (selected.action === 'complete') {body.executedQuantity=quantity === '' ? null : Number(quantity);body.executionNotes=notes;}
    if (selected.action === 'observe') body.reason=reason;
    if (['execution','complete'].includes(selected.action) && quantity !== '' && (!Number.isFinite(Number(quantity)) || Number(quantity) < 0)) {setError('La cantidad debe ser positiva o cero.');return;}
    if (selected.action === 'complete' && (!notes.trim() || (selected.location.unitItemId && quantity === ''))) {setError('Ingresa el reporte y la cantidad ejecutada cuando corresponda.');return;}
    if (selected.action === 'observe' && !reason.trim()) {setError('Indica el motivo de la observación.');return;}
    void mutate(() => interventionsApi.command(id,selected.location.id!,selected.action,body));
  };
  return <section className="space-y-6">
    <Link className="text-brand-600 underline" href="/intervenciones">Volver a intervenciones</Link>
    <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-bold">{data.code}</h1><StatusBadge code={data.statusCode} label={label('INTERVENTION_STATUS',data.statusCode)} /></div>
    {error && !selected && !cancelOpen && <p role="alert" className="text-action-danger">{error}</p>}
    <div className="space-y-2 rounded-lg border border-neutral-200 bg-neutral-0 p-5">
      <p className="font-medium">{unit(data.classItemId)}{data.typeItemId ? ` · ${unit(data.typeItemId)}` : ''}</p>
      <p>{data.description || 'Sin descripción'}</p><p>Programada: {data.scheduledDate}</p>
      <p>{data.completedLocationCount}/{data.locationCount} ubicaciones terminadas · {data.validatedLocationCount}/{data.locationCount} aprobadas</p>
      <p>{data.approvedForCounting ? 'Actividad con aprobación final del coordinador.' : 'La actividad contará cuando el coordinador apruebe todas las ubicaciones.'}</p>
      <p className="text-sm">{options?.teams.find(t => t.id === data.teamId)?.name ?? (data.teamId ? 'Cuadrilla asignada' : 'Sin cuadrilla asignada')}{data.responsibleSupervisorUserId ? ' · Responsable: capataz de la cuadrilla' : ''}</p>
      {data.pendingEvidenceCount > 0 && <p>Fotos pendientes: {data.pendingEvidenceCount}</p>}
      <div className="flex flex-wrap gap-3">
        {canPlan && <><Link href={`/intervenciones/${id}/editar`} className="px-3 py-2 text-brand-600 underline">Editar planificación</Link><Button variant="danger" disabled={busy} onClick={() => {setCancelOpen(true);setReason('');setError('');}}>Cancelar trabajo</Button></>}
        <Button variant="secondary" disabled={busy} onClick={reload}>Recargar datos</Button>
      </div>
    </div>
    {canAssign && <div className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-0 p-5"><h2 className="font-semibold">Asignación del trabajo</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <Select id="assign-team" label="Cuadrilla" value={team} options={(options?.teams ?? []).map(t => ({id:t.id,code:String(t.id),label:t.name}))} onChange={o => {setTeam(o?.code ?? '');setAssignee('');}} />
        <Select id="assign-user" label="Persona asignada" value={assignee} options={(teamOption?.assignees ?? []).map(u => ({id:u.id,code:String(u.id),label:u.fullName}))} onChange={o => setAssignee(o?.code ?? '')} />
      </div><Button disabled={busy || !team || !assignee} onClick={() => mutate(() => interventionsApi.assign(id,data.version,Number(team),Number(assignee)))}>Asignar</Button>
    </div>}
    <h2 className="text-xl font-semibold">Ubicaciones</h2>
    <div className="grid gap-5 xl:grid-cols-2">{data.locations.map((location,index) => {
      const photos = data.evidences.filter(e => e.interventionLocationId === location.id);
      return <article key={location.id} className="space-y-4 rounded-lg border border-neutral-200 bg-neutral-0 p-5">
        <div className="flex flex-wrap justify-between gap-2"><h3 className="font-semibold">Ubicación {index + 1}</h3><StatusBadge code={location.statusCode ?? ''} label={label('INTERVENTION_STATUS',location.statusCode ?? '')} /></div>
        <p>{location.locationDescription || location.description}</p>{location.description && <p>{location.description}</p>}
        <dl className="grid grid-cols-2 gap-2 text-sm"><dt>Cantidad solicitada</dt><dd>{location.requestedQuantity ?? 'Sin dato'} {unit(location.unitItemId)}</dd>
          <dt>Avance</dt><dd>{location.progressQuantity ?? 'Sin dato'} {unit(location.unitItemId)}</dd><dt>Cantidad ejecutada</dt><dd>{location.executedQuantity ?? 'Sin dato'} {unit(location.unitItemId)}</dd><dt>Intento</dt><dd>{location.attemptNumber}</dd></dl>
        {location.executionNotes && <p className="whitespace-pre-wrap">{location.executionNotes}</p>}
        {location.rejectionReason && <p className="rounded-md border border-action-danger p-3">Observación: {location.rejectionReason}</p>}
        <div className="flex flex-wrap gap-2">{(location.allowedActions ?? []).filter(a => a !== 'evidence').map(action => <Button key={action} variant={action === 'observe' ? 'secondary' : 'primary'} disabled={busy} onClick={() => openAction(location,action)}>{actionLabels[action]}</Button>)}</div>
        <h4 className="font-medium">Fotos de esta ubicación</h4>
        {photos.length === 0 && <p className="text-sm text-neutral-500">Aún no hay fotos.</p>}
        {photos.map(e => <div key={e.id} className="space-y-2 border-t border-neutral-200 pt-2">
          <p className="text-sm">{e.caption || 'Foto'} · intento {e.attemptNumber} · {e.uploadedAt ? 'Recibida' : 'Pendiente'}</p>
          {e.uploadedAt && <Button variant="secondary" onClick={async () => {try {const blob=await interventionsApi.photo(id,e.id);setPhoto({url:URL.createObjectURL(blob),caption:e.caption || 'Evidencia de la ubicación'});}catch(error){setError(interventionError(error));}}}>Ver foto</Button>}
          {!e.uploadedAt && e.canUpload && <EvidenceUpload work={data} location={location} pendingEvidence={e} onChange={refresh} />}
        </div>)}
        {location.allowedActions?.includes('evidence') && <EvidenceUpload key={`new-${location.id}-${location.attemptNumber}`} work={data} location={location} onChange={refresh} />}
      </article>;
    })}</div>
    <details className="rounded-lg border border-neutral-200 p-4"><summary className="cursor-pointer font-semibold">Historial de la actividad</summary><ol className="mt-3 space-y-2 text-sm">{data.history.map((event,index) => <li key={index}>
      {new Date(event.occurredAt).toLocaleString()} · {actionLabels[event.actionCode.toLowerCase()] ?? ({CREATED:'Creada',ASSIGNED:'Asignada',STARTED:'Inicio',PROGRESS_SAVED:'Avance guardado',COMPLETED:'Terminada',VALIDATED:'Aprobada',OBSERVED:'Observada',REOPENED:'Reabierta',UPDATED:'Planificación actualizada',REPROGRAMMED:'Reprogramada',CANCELLED:'Cancelada',EVIDENCE_ANNOUNCED:'Foto pendiente',EVIDENCE_UPLOADED:'Foto recibida'} as Record<string,string>)[event.actionCode] ?? 'Actualización'}
      {event.interventionLocationId && ` · Ubicación ${data.locations.findIndex(l => l.id === event.interventionLocationId) + 1}`}{event.reason && ` · ${event.reason}`}
    </li>)}</ol></details>
    <Modal isOpen={!!selected} onClose={() => {if (!busy) setSelected(null);}} title={selected ? `${actionLabels[selected.action]} · ubicación ${data.locations.findIndex(l => l.id === selected.location.id) + 1}` : ''} closeOnEsc={!busy} closeOnOverlayClick={!busy}
      footer={<><Button variant="secondary" disabled={busy} onClick={() => setSelected(null)}>Volver</Button><Button loading={busy} onClick={submitAction}>Confirmar</Button></>}>
      <div className="space-y-4"><p>{selected?.location.locationDescription}</p>
        {selected && ['execution','complete'].includes(selected.action) && <>
          {selected.location.unitItemId && <label className="grid gap-1 text-sm">Cantidad {unit(selected.location.unitItemId)}<input type="number" min="0" step="0.001" className="h-11 rounded-md border border-neutral-200 p-2" value={quantity} onChange={e => setQuantity(e.target.value)} disabled={busy} /></label>}
          <label className="grid gap-1 text-sm">Reporte de ejecución<textarea className="min-h-28 rounded-md border border-neutral-200 p-2" maxLength={4000} value={notes} onChange={e => setNotes(e.target.value)} disabled={busy} /></label>
        </>}
        {selected?.action === 'observe' && <Input id="observation-reason" label="Motivo de la observación" value={reason} onChange={setReason} required maxLength={2000} disabled={busy} />}
        {selected?.action === 'validate' && <p>Apruebas únicamente esta ubicación. El trabajo contará después de aprobarlas todas.</p>}
        {selected?.action === 'reopen' && <p>Se abrirá un nuevo intento para corregir esta ubicación. Las fotos y reportes anteriores se conservarán.</p>}
        {error && <div role="alert"><p className="text-action-danger">{error}</p><Button variant="secondary" disabled={busy} onClick={reload}>Recargar datos y conservar borrador</Button></div>}
      </div>
    </Modal>
    <Modal isOpen={cancelOpen} onClose={() => {if (!busy) setCancelOpen(false);}} title="Cancelar trabajo" closeOnEsc={!busy} closeOnOverlayClick={!busy}
      footer={<Button variant="danger" loading={busy} disabled={!reason.trim()} onClick={() => mutate(() => interventionsApi.cancel(id,data.version,reason))}>Confirmar cancelación</Button>}>
      <Input id="cancel-reason" label="Motivo" value={reason} onChange={setReason} maxLength={2000} required disabled={busy} />{error && <p role="alert">{error}</p>}
    </Modal>
    <Modal isOpen={!!photo} onClose={() => setPhoto(null)} title="Evidencia fotográfica" size="lg">
      {/* Blob URLs are loaded through the authenticated API client and are never public storage links. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {photo && <img src={photo.url} alt={photo.caption} className="max-h-[75vh] w-full object-contain" />}
    </Modal>
  </section>;
}
