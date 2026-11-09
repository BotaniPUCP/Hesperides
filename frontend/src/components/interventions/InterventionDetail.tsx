'use client';

import Link from 'next/link';
import { todayLocal } from '@/lib/local-date';
import { aOutcomes, errorDeDecision, type DecisionPoda } from './cierrePoda';
import { MedidasCierrePoda } from './MedidasCierrePoda';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCatalog } from '@/hooks/useCatalog';
import { useRememberedHref } from '@/hooks/useRememberedHref';
import { Button, Input, LoadingSkeleton, Modal, Select, StatusBadge, useToast } from '@/components/ui';
import { LIMITES, motivoDeRechazo } from '@/lib/upload-limits';
import { interventionsApi, interventionError, type InterventionDetail as Detail, type InterventionEvidence, type InterventionLocation, type InterventionOptions } from '@/lib/interventions-api';
import { InterventionForm } from './InterventionForm';
import { ApiError } from '@/lib/api';
import { createClientUuid } from '@/lib/client-uuid';
import { LocationObservations, LocationProgressHistory } from './LocationHistory';
import { ExecutionTime } from './ExecutionTime';
import { usePageTrail } from '@/components/layouts/PageTrailContext';

const actionLabels: Record<string,string> = {
  start:'Iniciar trabajo', execution:'Registrar avance', complete:'Enviar a revisión', validate:'Aprobar', observe:'Observar', reopen:'Subsanar observación',
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

const LIST_PATH = '/intervenciones';

export function InterventionDetail({ id, edit = false }: { id:number; edit?:boolean }) {
  const { user } = useAuth();
  const listHref = useRememberedHref(LIST_PATH);
  const { showToast } = useToast();
  const [data, setData] = useState<Detail | null>(null);
  usePageTrail(data ? { labels: { [id]: data.code } } : {});
  const [options, setOptions] = useState<InterventionOptions | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<{location:InterventionLocation; action:string} | null>(null);
  const [pruning,setPruning]=useState<Record<string,DecisionPoda>>({});
  const [pruningErrors,setPruningErrors]=useState<Record<string,string>>({});
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
    setBusy(true);setError('');setNotice('');
    try {setData(await action());setSelected(null);setCancelOpen(false);setReason('');showToast({variant:'success',title:'Intervención actualizada.'});}
    catch (e) {setError(interventionError(e));}
    finally {setBusy(false);}
  };
  const reload = async () => {
    setBusy(true);setError('');setNotice('');
    try {
      await refresh();
      setNotice(selected ? 'Información actualizada. Revisa los cambios antes de reintentar; tu borrador se conserva.' : 'Información actualizada con los últimos cambios guardados.');
    } catch(e){setError(interventionError(e));} finally {setBusy(false);}
  };
  if (!Number.isSafeInteger(id) || id < 1) return <p role="alert">Intervención no válida.</p>;
  if (loading) return <LoadingSkeleton variant="card" />;
  if (!data) return <div role="alert">{error}<Link href={listHref}>Volver al listado</Link></div>;
  if (edit) return data.startedAt || data.planningStatusCode === 'CANCELLED'
    ? <p>La planificación está cerrada. <Link href={`/intervenciones/${id}`}>Volver al detalle</Link></p>
    : <InterventionForm initial={data} />;
  const role = user?.role.code ?? '';
  const canPlan = ['ADMIN','COORDINADOR'].includes(role) && !data.startedAt && data.planningStatusCode !== 'CANCELLED';
  const canAssign = ['COORDINADOR','SUPERVISOR'].includes(role) && !data.startedAt && data.planningStatusCode !== 'CANCELLED';
  const teamOption = options?.teams.find(t => String(t.id) === team);
  const label = (type:string,code:string) => options?.catalogs.find(c => c.typeCode === type && c.code === code)?.label ?? code;
  const unit = (id:number|null|undefined) => options?.catalogs.find(c => c.id === id)?.label ?? '';
  const isPruning = options?.catalogs.find(c => c.id === data.classItemId)?.code === 'PODA';
  const pruningCodes = selected?.action === 'complete' && isPruning ? selected.location.linkedElementCodes ?? [] : [];
  const openAction = (location:InterventionLocation,action:string) => {setPruning({});setPruningErrors({});setSelected({location,action});setQuantity(String(location.progressQuantity ?? location.executedQuantity ?? ''));setNotes(location.executionNotes ?? '');setReason('');setError('');setNotice('');};
  const submitAction = () => {
    if (!selected) return;
    const body:Record<string,unknown> = {version:data.version};
    if (selected.action === 'execution') {body.progressQuantity=quantity === '' ? null : Number(quantity);body.executionNotes=notes;}
    if (selected.action === 'complete') {
      body.executedQuantity=quantity === '' ? null : Number(quantity);body.executionNotes=notes;
      const today=todayLocal();
      const invalid=Object.fromEntries(Object.entries(pruning).flatMap(([code,decision]) => {const message=errorDeDecision(decision,today);return message ? [[code,message]] : [];}));
      setPruningErrors(invalid);
      if (Object.keys(invalid).length > 0) return;
      const outcomes=aOutcomes(pruning);
      if (outcomes.length > 0) body.measurementOutcomes=outcomes;
    }
    if (selected.action === 'observe') body.reason=reason;
    if (['execution','complete'].includes(selected.action) && quantity !== '' && (!Number.isFinite(Number(quantity)) || Number(quantity) < 0)) {setError('La cantidad debe ser positiva o cero.');return;}
    if (selected.action === 'complete' && (!notes.trim() || (selected.location.unitItemId && quantity === ''))) {setError('Ingresa el reporte y la cantidad ejecutada cuando corresponda.');return;}
    if (selected.action === 'observe' && !reason.trim()) {setError('Indica el motivo de la observación.');return;}
    void mutate(() => interventionsApi.command(id,selected.location.id!,selected.action,body));
  };
  return <section className="space-y-6">
    <div className="surface-card flex flex-wrap items-center justify-between gap-3"><h1 className="page-title">{data.code}</h1><StatusBadge code={data.statusCode} label={label('INTERVENTION_STATUS',data.statusCode)} /></div>
    {error && !selected && !cancelOpen && <p role="alert" className="text-action-danger">{error}</p>}
    {notice && !selected && <p role="status">{notice}</p>}
    <div className="surface-card space-y-2">
      <p className="font-medium">{unit(data.classItemId)}{data.typeItemId ? ` · ${unit(data.typeItemId)}` : ''}</p>
      <p>{data.description || 'Sin descripción'}</p><p>Programada: {data.scheduledDate}</p>
      <ExecutionTime work={data}/>
      {data.executionBlockedUntil && <p role="status" className="rounded-md border border-neutral-200 p-3">El trabajo podrá ejecutarse desde el {data.executionBlockedUntil}. Si debe adelantarse, solicita al coordinador que revise la planificación.</p>}
      <p>{data.completedLocationCount}/{data.locationCount} ubicaciones terminadas · {data.validatedLocationCount}/{data.locationCount} aprobadas</p>
      <p>{data.approvedForCounting ? 'Actividad con aprobación final.' : 'La actividad contará cuando el capataz responsable o el coordinador aprueben todas las ubicaciones.'}</p>
      <p className="text-sm">{options?.teams.find(t => t.id === data.teamId)?.name ?? (data.teamId ? 'Cuadrilla asignada' : 'Sin cuadrilla asignada')}{data.responsibleSupervisorUserId ? ' · Responsable: capataz de la cuadrilla' : ''}</p>
      {!!data.sourceIncidents?.length && <div className="space-y-2"><p className="font-medium">Incidencias relacionadas disponibles para tu cuenta</p>
        <ul className="space-y-2">{data.sourceIncidents.map(i => <li key={i.id}><Link className="text-brand-700 underline" href={`/incidencias/${i.id}`}>{i.code ?? `Incidencia #${i.id}`}</Link></li>)}</ul>
        <p className="text-sm text-neutral-700">Aprobar esta intervención no cierra sus incidencias. Cada una requiere una revisión final independiente.</p>
      </div>}
      {data.pendingEvidenceCount > 0 && <p>Fotos pendientes: {data.pendingEvidenceCount}</p>}
      <div className="flex flex-wrap gap-3">
        {canPlan && <><Link href={`/intervenciones/${id}/editar`} className="px-3 py-2 text-brand-600 underline">Editar planificación</Link><Button variant="danger" disabled={busy} onClick={() => {setCancelOpen(true);setReason('');setError('');}}>Cancelar trabajo</Button></>}
        <Button variant="secondary" disabled={busy} onClick={reload}>Actualizar información</Button>
      </div>
      <p className="text-sm text-neutral-500">Actualiza la información para consultar cambios guardados por otras personas. Tus acciones se guardan al confirmarlas.</p>
    </div>
    {canAssign && <div className="surface-card space-y-3"><h2 className="font-semibold">Asignación del trabajo</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <Select id="assign-team" label="Cuadrilla" value={team} options={(options?.teams ?? []).map(t => ({id:t.id,code:String(t.id),label:t.name}))} onChange={o => {setTeam(o?.code ?? '');setAssignee('');}} />
        <Select id="assign-user" label="Persona asignada" value={assignee} options={(teamOption?.assignees ?? []).map(u => ({id:u.id,code:String(u.id),label:u.fullName}))} onChange={o => setAssignee(o?.code ?? '')} />
      </div><Button disabled={busy || !team || !assignee} onClick={() => mutate(() => interventionsApi.assign(id,data.version,Number(team),Number(assignee)))}>Asignar</Button>
    </div>}
    <h2 className="surface-pill text-xl font-semibold">Ubicaciones</h2>
    <div className="grid gap-5 xl:grid-cols-2">{data.locations.map((location,index) => {
      const photos = data.evidences.filter(e => e.interventionLocationId === location.id);
      return <article key={location.id} className="surface-card space-y-4">
        <div className="flex flex-wrap justify-between gap-2"><h3 className="font-semibold">Ubicación {index + 1}</h3><StatusBadge code={location.statusCode ?? ''} label={label('INTERVENTION_STATUS',location.statusCode ?? '')} /></div>
        <p>{location.locationDescription || location.description}</p>{location.description && <p>{location.description}</p>}
        <dl className="grid grid-cols-2 gap-2 text-sm"><dt>Cantidad solicitada</dt><dd>{location.requestedQuantity ?? 'Sin dato'} {unit(location.unitItemId)}</dd>
          <dt>Avance acumulado</dt><dd>{location.progressQuantity ?? 'Sin dato'} {unit(location.unitItemId)}</dd><dt>Cantidad ejecutada</dt><dd>{location.executedQuantity ?? 'Sin dato'} {unit(location.unitItemId)}</dd><dt>Intento</dt><dd>{location.attemptNumber}</dd></dl>
        {location.executionNotes && <p className="whitespace-pre-wrap">{location.executionNotes}</p>}
        <LocationObservations locationId={location.id} history={data.history} fallbackReason={location.rejectionReason} />
        <LocationProgressHistory locationId={location.id} history={data.history} unit={unit} />
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
    <details className="surface-card"><summary className="cursor-pointer font-semibold">Historial de la actividad</summary><ol className="mt-3 space-y-2 text-sm">{data.history.map((event,index) => <li key={index}>
      {new Date(event.occurredAt).toLocaleString()} · {actionLabels[event.actionCode.toLowerCase()] ?? ({CREATED:'Creada',ASSIGNED:'Asignada',STARTED:'Trabajo iniciado',PROGRESS_SAVED:'Avance registrado',COMPLETED:'Enviada a revisión',VALIDATED:'Aprobada',OBSERVED:'Observada',REOPENED:'Subsanación iniciada',UPDATED:'Planificación actualizada',REPROGRAMMED:'Reprogramada',CANCELLED:'Cancelada',EVIDENCE_ANNOUNCED:'Foto pendiente',EVIDENCE_UPLOADED:'Foto recibida'} as Record<string,string>)[event.actionCode] ?? 'Actualización'}
      {event.interventionLocationId && ` · Ubicación ${data.locations.findIndex(l => l.id === event.interventionLocationId) + 1}`}{event.reason && ` · ${event.reason}`}
    </li>)}</ol></details>
    <Modal isOpen={!!selected} onClose={() => {if (!busy) setSelected(null);}} title={selected ? `${actionLabels[selected.action]} · ubicación ${data.locations.findIndex(l => l.id === selected.location.id) + 1}` : ''} closeOnEsc={!busy} closeOnOverlayClick={!busy}
      footer={<><Button variant="secondary" disabled={busy} onClick={() => setSelected(null)}>Volver</Button><Button loading={busy} onClick={submitAction}>Confirmar</Button></>}>
      <div className="space-y-4"><p>{selected?.location.locationDescription}</p>
        {selected && ['reopen','execution','complete'].includes(selected.action) && <LocationObservations locationId={selected.location.id} history={data.history} fallbackReason={selected.location.rejectionReason} />}
        {selected && ['execution','complete'].includes(selected.action) && <>
          {selected.location.unitItemId && <label className="grid gap-1 text-sm">Cantidad {unit(selected.location.unitItemId)}<input type="number" min="0" step="0.001" className="h-11 rounded-md border border-neutral-200 p-2" value={quantity} onChange={e => setQuantity(e.target.value)} disabled={busy} /></label>}
          {selected.action === 'execution' && <p className="text-sm text-neutral-500">Indica el total realizado hasta ahora en esta ubicación. Cada registro conserva su cantidad, descripción y fecha en el historial.</p>}
          <label className="grid gap-1 text-sm">Reporte de ejecución<textarea className="min-h-28 rounded-md border border-neutral-200 p-2" maxLength={4000} value={notes} onChange={e => setNotes(e.target.value)} disabled={busy} /></label>
          {pruningCodes.length > 0 && <MedidasCierrePoda codigos={pruningCodes} decisiones={pruning} onCambiar={setPruning} hoy={todayLocal()} errores={pruningErrors} disabled={busy} />}
        </>}
        {selected?.action === 'observe' && <Input id="observation-reason" label="Motivo de la observación" value={reason} onChange={setReason} required maxLength={2000} disabled={busy} />}
        {selected?.action === 'validate' && <p>Apruebas únicamente esta ubicación. El trabajo contará después de aprobarlas todas.</p>}
        {selected?.action === 'reopen' && <p>Se abrirá un nuevo intento para subsanar esta ubicación. Las observaciones, fotos y avances anteriores seguirán disponibles.</p>}
        {notice && <p role="status">{notice}</p>}
        {error && <div role="alert"><p className="text-action-danger">{error}</p><Button variant="secondary" disabled={busy} onClick={reload}>Actualizar información y conservar borrador</Button></div>}
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
