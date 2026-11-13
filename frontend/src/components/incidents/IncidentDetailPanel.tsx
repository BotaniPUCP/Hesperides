'use client';

import { useRef, useState } from 'react';
import type { IncidentDetail, IncidentOptions, IncidentPhoto, IncidentReview } from '@shared/types';
import { Button, Card, LoadingSkeleton, Modal, Select, StatusBadge, Textarea, UrgencyBadge, type UrgencyCode } from '@/components/ui';
import { useRequest } from '@/hooks/useRequest';
import { incidentsApi } from '@/lib/incidents-api';
import { mensajeDeApiError } from '@/lib/api-errors';
import { incidentDate } from '@/lib/incidentNavigation';
import { LocationFields, locationPayload } from './LocationFields';
import { IncidentMatrixFields, IncidentMatrixSummary, IncidentZoneField, matrixReview } from './IncidentMatrixFields';
import { IncidentCommunication } from './IncidentCommunication';
import { IncidentPreviousCases } from './IncidentPreviousCases';
import { IncidentInterventionLinks } from './IncidentInterventionLinks';
import { IncidentRegistrationReview } from './IncidentRegistrationReview';
import { IncidentResolutionReview } from './IncidentResolutionReview';
import { useUnsavedChangesGuard } from '@/components/forms/unsaved/useUnsavedChangesGuard';
import { IncidentWorkspace } from './IncidentWorkspace';

function Photo({ incidentId, photo }: { incidentId: number; photo: IncidentPhoto }) {
  const [retry, setRetry] = useState(0);
  const request = useRequest(`${incidentId}:${photo.id}:${retry}`, () => incidentsApi.photo(incidentId, photo.id));
  const source = request.data ? `data:${request.data.contentType};base64,${request.data.base64}` : null;
  return <figure className="space-y-2">
    {/* Authenticated image bytes are loaded through the central API client. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {source ? <img src={source} alt={`Evidencia de la incidencia ${incidentId}, fotografía ${photo.id}`} className="max-h-96 w-full rounded-md object-contain" />
      : request.loading && <LoadingSkeleton variant="card" />}
    {(request.errorMessage || request.notFound) && <div role="alert" className="space-y-3 rounded-md bg-alert-danger-bg p-3 text-alert-danger-fg"><p>{request.errorMessage ?? 'La fotografía no está disponible.'}</p><Button variant="secondary" size="lg" onClick={() => setRetry((v) => v + 1)}>Reintentar foto</Button></div>}
    <figcaption className="text-xs text-neutral-700">Recibida: {incidentDate(photo.createdAt)}</figcaption>
  </figure>;
}

function ReviewForm({ detail, options, busy, onSave, onCancel }: {
  detail: IncidentDetail; options: IncidentOptions; busy: boolean;
  onSave: (review: IncidentReview) => Promise<boolean>;
  onCancel: () => void;
}) {
  const incident = detail.incident;
  const [description, setDescription] = useState(incident.description);
  const [location, setLocation] = useState({ reference: incident.locationReference ?? '', latitude: incident.latitude?.toString() ?? '', longitude: incident.longitude?.toString() ?? '' });
  const [type, setType] = useState<string | null>(incident.type?.code ?? (incident.approvedAt ? null : detail.suggestedType?.code ?? null));
  const [urgency, setUrgency] = useState<string | null>(incident.urgency?.code ?? null);
  const [teamId, setTeamId] = useState(incident.team?.id.toString() ?? '');
  const [matrix, setMatrix] = useState(() => matrixReview(incident.matrix));
  const [error, setError] = useState('');
  const [descriptionError, setDescriptionError] = useState('');
  const [dirty,setDirty] = useState(false);
  const guard = useUnsavedChangesGuard(dirty);
  const save = async () => {
    if (!description.trim()) { setDescriptionError('La descripción no puede quedar vacía.'); return; }
    setDescriptionError('');
    try {
      const review = { description: description.trim(), ...locationPayload(location), version: incident.version,
        typeCode: type, urgencyCode: urgency, teamId: teamId ? Number(teamId) : null, matrix };
      setError(''); if (await onSave(review)) { setDirty(false); onCancel(); }
    } catch (ex) { setError((ex as Error).message); }
  };
  return <div className="overflow-hidden rounded-xl border border-neutral-200 bg-neutral-0">
    {guard.dialog}
    <form onChange={() => setDirty(true)} onSubmit={(e) => { e.preventDefault(); void save(); }}>
      <section className="space-y-4 px-5 py-6 sm:px-7">
      <h2 className="flex items-center gap-3 text-[13px] font-semibold"><span className="grid h-6 w-6 place-content-center rounded-md bg-brand-50 text-xs text-brand-800">01</span>Descripción y ubicación</h2>
      <Textarea id="review-description" label="Descripción" value={description} rows={3} maxLength={10000} disabled={busy} required
        errorMessage={descriptionError} onChange={(value) => { setDescription(value); setDescriptionError(''); }} />
      <div className="grid gap-4 sm:grid-cols-2">
        <LocationFields value={location} onChange={(next) => { setLocation(next); setDirty(true); }} disabled={busy} compact />
        <IncidentZoneField value={matrix.zoneId ?? null} options={options.matrix} disabled={busy} onChange={zoneId => { setMatrix({ ...matrix, zoneId }); setDirty(true); }} />
      </div>
      </section>
      <div className="px-5 sm:px-7">
      <IncidentMatrixFields value={matrix} original={incident.matrix} options={options.matrix} disabled={busy} includeZone={false} onChange={(next) => { setMatrix(next); setDirty(true); }}
        priority={<Select id="review-urgency" label="Urgencia" size="lg" options={options.urgencies} value={urgency} onChange={(v) => setUrgency(v?.code ?? null)} clearable disabled={busy} placeholder="Sin evaluar" />}
        management={<><Select id="review-type" label="Tipo de incidencia" size="lg" options={options.types} value={type} onChange={(v) => setType(v?.code ?? null)} clearable disabled={busy} placeholder="Sin clasificar" />
        <Select id="review-team" label="Cuadrilla responsable" size="lg" value={teamId || null} disabled={busy} clearable placeholder="Sin asignar"
        onChange={(team) => setTeamId(team?.code ?? '')}
        options={[
          ...(incident.team && !options.teams.some((t) => t.id === incident.team?.id) ? [{ id: incident.team.id, code: String(incident.team.id), label: `${incident.team.name} (no disponible)` }] : []),
          ...options.teams.map((team) => ({ id: team.id, code: String(team.id), label: team.name })),
        ]} /></>} />
      {error && <p role="alert" className="rounded-md bg-alert-danger-bg p-3 text-sm text-alert-danger-fg">{error}</p>}
      </div>
      <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 bg-neutral-0 px-5 py-4 sm:px-7">
        <span className="text-xs text-neutral-600">{dirty ? 'Cambios sin guardar' : 'Edición del registro'}</span>
        <div className="flex gap-2"><Button variant="ghost" disabled={busy} onClick={() => guard.confirm(onCancel)}>Cancelar</Button>
        <Button type="submit" disabled={busy} loading={busy}>Guardar cambios</Button></div>
      </div>
    </form>
  </div>;
}

export function IncidentDetailPanel({ detail, options, optionsLoading, coordinator, onChange, onReload, selectedInterventionId = null, createInterventionHref = '/intervenciones/nueva' }: {
  detail: IncidentDetail; options: IncidentOptions | null; optionsLoading: boolean; coordinator: boolean;
  onChange: (detail: IncidentDetail) => void; onReload: () => void;
  selectedInterventionId?: number | null; createInterventionHref?: string;
}) {
  const { incident } = detail;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [tab, setTab] = useState<'data' | 'works' | 'activity'>(selectedInterventionId ? 'works' : 'data');
  const [editing, setEditing] = useState(false);
  const [originalOpen, setOriginalOpen] = useState(false);
  const operating = useRef(false);
  const mutate = async (action: () => Promise<IncidentDetail>, success: string) => {
    if (operating.current) return false;
    operating.current = true; setBusy(true); setError(''); setMessage('');
    try { onChange(await action()); setMessage(success); return true; }
    catch (ex) { setError(mensajeDeApiError(ex)); return false; }
    finally { operating.current = false; setBusy(false); }
  };
  const resolved = incident.status.code === 'RESOLVED';
  const canWork = detail.canAttend && incident.approvedAt !== null && !resolved;

  return <IncidentWorkspace>
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-2"><h1 className="page-title">{editing ? 'Editar incidencia' : incident.officialCode ?? `Incidencia #${incident.id}`}</h1>
        <div className="flex flex-wrap gap-2"><StatusBadge code={incident.status.code} label={incident.status.label} />
          {editing && <span className="text-xs font-semibold text-neutral-600">{incident.officialCode ?? `INCIDENCIA #${incident.id}`}</span>}
          {incident.urgency && <UrgencyBadge code={incident.urgency.code as UrgencyCode} label={incident.urgency.label} />}
        </div>
      </div>
      <div className="flex flex-wrap gap-2"><Button variant="ghost" onClick={() => setOriginalOpen(true)}>Ver reporte original</Button>
        {detail.canEdit && !detail.canCorrectReport && !editing && <Button variant="secondary" disabled={busy || !options} onClick={() => { setTab('data'); setEditing(true); }}>Editar</Button>}</div>
    </header>
    <p className="text-sm text-neutral-700">{incident.reportedBy.fullName} · {incidentDate(incident.createdAt)} · {incident.channel === 'WEB' ? 'Web' : incident.channel}</p>
    <Modal isOpen={originalOpen} onClose={() => setOriginalOpen(false)} title="Reporte original"><blockquote className="whitespace-pre-wrap break-words rounded-md border-l-4 border-brand-600 bg-neutral-50 p-4">{incident.originalDescription}</blockquote></Modal>
    {message && <p role="status" className="rounded-lg border border-alert-success-border bg-alert-success-bg p-3 text-alert-success-fg">{message}</p>}
    {error && <p role="alert" className="rounded-lg bg-alert-danger-bg p-3 text-alert-danger-fg">{error}</p>}
    {incident.resolutionObservation && !resolved && <p className="whitespace-pre-wrap rounded-md bg-alert-warning-bg p-3 text-alert-warning-fg">Resolución observada: {incident.resolutionObservation}</p>}
    <nav aria-label="Contenido de la incidencia" className="flex gap-5 border-b border-neutral-300">
      {([['data','Datos del caso'],['works',`Intervenciones (${detail.requiredInterventionCount})`],['activity','Actividad']] as const).map(([value,label]) =>
        <button key={value} type="button" aria-current={tab === value ? 'page' : undefined} disabled={editing || busy} onClick={() => setTab(value)}
          className={`min-h-12 border-b-2 px-1 text-sm font-semibold disabled:cursor-not-allowed ${tab === value ? 'border-brand-600 text-brand-800' : 'border-transparent text-neutral-700 hover:text-brand-800'}`}>{label}</button>)}
    </nav>
    <div className="space-y-5" hidden={tab !== 'data'}>
      {!editing && !detail.canCorrectReport && <>
        <Card>
          <p className="mb-6 whitespace-pre-wrap break-words text-xl leading-relaxed">{incident.description}</p>
           <dl className="mb-6 grid gap-5 text-sm text-neutral-700 sm:grid-cols-2 lg:grid-cols-3">
            <div><dt className="font-medium">Cuadrilla responsable</dt><dd>{incident.team?.name ?? 'Sin asignar'}</dd></div>
            <div><dt className="font-medium">Clasificación / urgencia</dt><dd>{incident.type?.label ?? 'Sin clasificar'} · {incident.urgency?.label ?? 'Sin evaluar'}</dd></div>
            <div><dt className="font-medium">Referencia del lugar</dt><dd className="break-words">{incident.locationReference ?? 'No indicada'}</dd></div>
            {incident.latitude !== null && <div><dt className="font-medium">Coordenadas</dt><dd>{incident.latitude}, {incident.longitude}</dd></div>}
            {incident.approvedAt && <div><dt className="font-medium">Registro oficial confirmado por</dt><dd>{incident.approvedBy?.fullName} · {incidentDate(incident.approvedAt)}</dd></div>}
          </dl>
          {resolved && <p className="mb-4 text-sm text-neutral-700">Caso cerrado. Coordinación puede reabrirlo con una observación antes de modificarlo.</p>}
          <IncidentMatrixSummary matrix={incident.matrix} />
          {incident.resolvedAt && <div className="mt-4 space-y-2 text-sm"><p>Cerrada: {incidentDate(incident.resolvedAt)} · {incident.closureBusinessDays} días hábiles inclusivos desde recepción.</p>
            <p className="whitespace-pre-wrap break-words">Cómo se resolvió: {incident.resolutionSummary ?? 'Sin resumen de resolución.'}</p>
            {incident.resolvedBy && <p>Validó la resolución: {incident.resolvedBy.fullName}</p>}</div>}
        </Card>
        {detail.photos.length > 0 && <details><summary className="min-h-12 cursor-pointer py-3 text-sm font-semibold text-brand-800">Fotografías ({detail.photos.length})</summary><Card><div className="grid gap-5 sm:grid-cols-2">{detail.photos.map((photo) => <Photo key={photo.id} incidentId={incident.id} photo={photo} />)}</div></Card></details>}
        {coordinator && !incident.approvedAt && incident.status.code === 'PENDING_APPROVAL' && <Button disabled={busy} loading={busy}
          onClick={() => void mutate(() => incidentsApi.approve(incident.id,incident.version),'Registro oficial confirmado.')}>Registrar incidencia oficialmente</Button>}
      </>}
      {optionsLoading && !resolved && <LoadingSkeleton variant="card" />}
      {editing && detail.canEdit && !detail.canCorrectReport && options && <ReviewForm key={incident.id} detail={detail} options={options} busy={busy} onCancel={() => setEditing(false)}
        onSave={async (review) => mutate(() => incidentsApi.review(incident.id, review), 'Cambios guardados.')} />}
      {!editing && <>
        {detail.canCorrectReport || incident.status.code === 'CHANGES_REQUESTED' ? <IncidentRegistrationReview key={`registration:${incident.id}:${incident.version}`} detail={detail} options={options} coordinator={coordinator} busy={busy}
          onReturn={(reason) => mutate(() => incidentsApi.requestCorrection(incident.id,incident.version,reason),'Corrección solicitada al remitente.')}
          onResubmit={(report) => mutate(() => incidentsApi.resubmit(incident.id,incident.version,report),'Reporte corregido y reenviado.')} /> : coordinator && !incident.approvedAt && <details><summary className="min-h-12 cursor-pointer py-3 text-sm font-medium text-brand-800">Solicitar corrección al remitente</summary>
            <IncidentRegistrationReview key={`registration:${incident.id}:${incident.version}`} detail={detail} options={options} coordinator={coordinator} busy={busy}
              onReturn={(reason) => mutate(() => incidentsApi.requestCorrection(incident.id,incident.version,reason),'Corrección solicitada al remitente.')}
              onResubmit={(report) => mutate(() => incidentsApi.resubmit(incident.id,incident.version,report),'Reporte corregido y reenviado.')} /></details>}
        {coordinator && !resolved && <details><summary className="min-h-12 cursor-pointer py-3 text-sm font-medium text-brand-800">Consultar casos anteriores</summary><IncidentPreviousCases incidentId={incident.id} disabled={busy} /></details>}
        {!incident.approvedAt && !coordinator && incident.status.code === 'PENDING_APPROVAL' && <Card><p>Tu información fue recibida. Está pendiente de revisión y registro oficial por el coordinador.</p></Card>}
      </>}
    </div>
    <div className="space-y-5" hidden={tab !== 'activity'}>
        <IncidentCommunication updates={detail.updates} busy={busy}
          onComment={(body, reference) => mutate(() => incidentsApi.comment(incident.id, body, reference), 'Comentario recibido.')} />
        <Card title="Historial"><ol className="space-y-4">{detail.history.map((entry) => <li key={entry.id} className="border-l-2 border-neutral-200 pl-3 text-sm">
          <p className="font-medium">{entry.status.label}</p><p>{entry.changedBy.fullName}</p><p className="text-neutral-700">{incidentDate(entry.createdAt)}</p>
        </li>)}</ol></Card>
        <Button variant="ghost" disabled={busy} onClick={onReload}>Recargar actividad</Button>
    </div>
    <div className="space-y-5" hidden={tab !== 'works'}>
        <IncidentInterventionLinks detail={detail} options={options} coordinator={coordinator} busy={busy}
          selectedInterventionId={selectedInterventionId} createHref={createInterventionHref}
          onRemove={(linkId,reason) => mutate(() => incidentsApi.unlinkIntervention(incident.id,linkId,incident.version,reason),'Vínculo retirado; la intervención se conserva.')}
          onLink={(request) => mutate(() => incidentsApi.linkIntervention(incident.id,request),'Intervención vinculada.')} />
        {canWork && <Card title="Estado de atención"><div className="space-y-3">
          {incident.status.code === 'OPEN' && <Button variant="secondary" size="lg" disabled={busy} onClick={() => void mutate(() => incidentsApi.start(incident.id), 'Atención iniciada.')}>Iniciar atención</Button>}
          <p className="text-sm text-neutral-700">La validación final y el cierre de la incidencia corresponden al coordinador, después de validar sus intervenciones requeridas.</p>
        </div></Card>}
        {coordinator && incident.approvedAt && <IncidentResolutionReview detail={detail} busy={busy}
          onResolve={(summary) => mutate(() => incidentsApi.resolve(incident.id,incident.version,summary),'Resolución validada e incidencia cerrada.')}
          onObserve={(reason) => mutate(() => incidentsApi.observeResolution(incident.id,incident.version,reason),'Resolución observada; la incidencia queda abierta.')} />}
    </div>
  </IncidentWorkspace>;
}
