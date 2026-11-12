'use client';

import { useRef, useState } from 'react';
import type { IncidentDetail, IncidentOptions, IncidentPhoto, IncidentReview } from '@shared/types';
import { Button, Card, LoadingSkeleton, Select, StatusBadge, Textarea, UrgencyBadge, type UrgencyCode } from '@/components/ui';
import { useRequest } from '@/hooks/useRequest';
import { incidentsApi } from '@/lib/incidents-api';
import { mensajeDeApiError } from '@/lib/api-errors';
import { incidentDate } from '@/lib/incidentNavigation';
import { LocationFields, locationPayload } from './LocationFields';
import { IncidentMatrixFields, IncidentMatrixSummary, matrixReview } from './IncidentMatrixFields';
import { IncidentCommunication } from './IncidentCommunication';
import { IncidentPreviousCases } from './IncidentPreviousCases';
import { IncidentInterventionLinks } from './IncidentInterventionLinks';
import { IncidentRegistrationReview } from './IncidentRegistrationReview';
import { IncidentResolutionReview } from './IncidentResolutionReview';
import { useUnsavedChangesGuard } from '@/components/forms/unsaved/useUnsavedChangesGuard';

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

function ReviewForm({ detail, options, busy, onSave }: {
  detail: IncidentDetail; options: IncidentOptions; busy: boolean;
  onSave: (review: IncidentReview, approve: boolean) => Promise<boolean>;
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
  const save = async (approve: boolean) => {
    if (!description.trim()) { setDescriptionError('La descripción no puede quedar vacía.'); return; }
    setDescriptionError('');
    try {
      const review = { description: description.trim(), ...locationPayload(location), version: incident.version,
        typeCode: type, urgencyCode: urgency, teamId: teamId ? Number(teamId) : null, matrix };
      setError(''); if (await onSave(review, approve)) setDirty(false);
    } catch (ex) { setError((ex as Error).message); }
  };
  return <Card title={incident.approvedAt ? 'Datos de atención' : 'Revisión del registro'}>
    {guard.dialog}
    <form className="space-y-4" onChange={() => setDirty(true)} onSubmit={(e) => { e.preventDefault(); void save(false); }}>
      <Textarea id="review-description" label="Descripción" value={description} rows={4} maxLength={10000} disabled={busy} required
        errorMessage={descriptionError} onChange={(value) => { setDescription(value); setDescriptionError(''); }} />
      <p className="text-sm text-neutral-700">La categoría operativa sigue siendo provisional. La urgencia es independiente de la severidad e impactos de la matriz OSG. Puedes dejar sin clasificar lo que aún no se conoce.</p>
      {detail.suggestedType && !incident.approvedAt && <p className="text-sm text-brand-700">Sugerencia por el texto: {detail.suggestedType.label}. Confirma o cambia la selección.</p>}
      <Select id="review-type" label="Tipo de incidencia" size="lg" options={options.types} value={type} onChange={(v) => setType(v?.code ?? null)} clearable disabled={busy} placeholder="Sin clasificar" />
      <Select id="review-urgency" label="Urgencia" size="lg" options={options.urgencies} value={urgency} onChange={(v) => setUrgency(v?.code ?? null)} clearable disabled={busy} placeholder="Sin evaluar" />
      <Select id="review-team" label="Cuadrilla responsable" size="lg" value={teamId || null} disabled={busy} clearable placeholder="Sin asignar"
        onChange={(team) => setTeamId(team?.code ?? '')}
        options={[
          ...(incident.team && !options.teams.some((t) => t.id === incident.team?.id) ? [{ id: incident.team.id, code: String(incident.team.id), label: `${incident.team.name} (no disponible)` }] : []),
          ...options.teams.map((team) => ({ id: team.id, code: String(team.id), label: team.name })),
        ]} />
      {options.teams.length === 0 && <p className="text-sm text-neutral-700">Todavía no hay cuadrillas activas configuradas. Puedes aprobar y asignar después.</p>}
      <LocationFields value={location} onChange={setLocation} disabled={busy} />
      <IncidentMatrixFields value={matrix} original={incident.matrix} options={options.matrix} disabled={busy} onChange={setMatrix} />
      {error && <p role="alert" className="rounded-md bg-alert-danger-bg p-3 text-sm text-alert-danger-fg">{error}</p>}
      <div className="flex flex-wrap gap-3">
        {!incident.approvedAt && <Button type="button" size="lg" loading={busy} disabled={incident.status.code !== 'PENDING_APPROVAL'} onClick={() => void save(true)}>Registrar incidencia oficialmente</Button>}
        <Button type="submit" size="lg" variant={incident.approvedAt ? 'primary' : 'secondary'} disabled={busy}>Guardar cambios</Button>
      </div>
    </form>
  </Card>;
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

  return <div className="space-y-6">
    <header className="surface-card flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-2"><h1 className="page-title">{incident.officialCode ?? `Incidencia #${incident.id}`}</h1>
        <div className="flex flex-wrap gap-2"><StatusBadge code={incident.status.code} label={incident.status.label} />
          {incident.urgency && <UrgencyBadge code={incident.urgency.code as UrgencyCode} label={incident.urgency.label} />}
        </div>
      </div>
      <Button variant="secondary" size="lg" disabled={busy} onClick={onReload}>Actualizar detalle</Button>
    </header>
    <p className="surface-card whitespace-pre-wrap break-words text-lg text-neutral-900">{incident.description}</p>
    {message && <p role="status" className="rounded-lg border border-alert-success-border bg-alert-success-bg p-3 text-alert-success-fg">{message}</p>}
    {error && <p role="alert" className="rounded-lg bg-alert-danger-bg p-3 text-alert-danger-fg">{error}</p>}
    {incident.resolutionObservation && !resolved && <p className="whitespace-pre-wrap rounded-md bg-alert-warning-bg p-3 text-alert-warning-fg">Resolución observada: {incident.resolutionObservation}</p>}
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
      <div className="min-w-0 space-y-5">
        <Card title="Información recibida">
          <blockquote className="whitespace-pre-wrap break-words rounded-md bg-neutral-50 p-3">{incident.originalDescription}</blockquote>
          <dl className="mt-4 space-y-2 text-sm text-neutral-700">
            <div><dt className="font-medium">Enviada por</dt><dd>{incident.reportedBy.fullName}</dd></div>
            <div><dt className="font-medium">Recibida</dt><dd>{incidentDate(incident.createdAt)} · {incident.channel === 'WEB' ? 'Web' : incident.channel}</dd></div>
            <div><dt className="font-medium">Cuadrilla responsable</dt><dd>{incident.team?.name ?? 'Sin asignar'}</dd></div>
            <div><dt className="font-medium">Clasificación / urgencia</dt><dd>{incident.type?.label ?? 'Sin clasificar'} · {incident.urgency?.label ?? 'Sin evaluar'}</dd></div>
            <div><dt className="font-medium">Referencia del lugar</dt><dd className="break-words">{incident.locationReference ?? 'No indicada'}</dd></div>
            {incident.latitude !== null && <div><dt className="font-medium">Coordenadas</dt><dd>{incident.latitude}, {incident.longitude}</dd></div>}
            {incident.approvedAt && <div><dt className="font-medium">Registro oficial confirmado por</dt><dd>{incident.approvedBy?.fullName} · {incidentDate(incident.approvedAt)}</dd></div>}
          </dl>
        </Card>
        {detail.photos.length > 0 && <Card title="Fotografías"><div className="space-y-5">{detail.photos.map((photo) => <Photo key={photo.id} incidentId={incident.id} photo={photo} />)}</div></Card>}
        <Card title="Matriz OSG"><details><summary className="cursor-pointer py-2 text-sm text-brand-700">Ver datos del registro</summary><IncidentMatrixSummary matrix={incident.matrix} /></details>
          {incident.resolvedAt && <div className="mt-4 space-y-2 text-sm"><p>Cerrada: {incidentDate(incident.resolvedAt)} · {incident.closureBusinessDays} días hábiles inclusivos desde recepción.</p>
            <p className="whitespace-pre-wrap break-words">Cómo se resolvió: {incident.resolutionSummary ?? 'Sin resumen: cierre del registro anterior.'}</p>
            {incident.resolvedBy && <p>Validó la resolución: {incident.resolvedBy.fullName}</p>}</div>}
        </Card>
        <IncidentCommunication updates={detail.updates} busy={busy}
          onComment={(body, reference) => mutate(() => incidentsApi.comment(incident.id, body, reference), 'Comentario recibido.')} />
        <Card title="Historial"><ol className="space-y-4">{detail.history.map((entry) => <li key={entry.id} className="border-l-2 border-neutral-200 pl-3 text-sm">
          <p className="font-medium">{entry.status.label}</p><p>{entry.changedBy.fullName}</p><p className="text-neutral-700">{incidentDate(entry.createdAt)}</p>
        </li>)}</ol></Card>
      </div>
      <div className="min-w-0 space-y-5">
        {optionsLoading && !resolved && <LoadingSkeleton variant="card" />}
        {coordinator && !resolved && options && <ReviewForm key={`${incident.id}:${incident.version}`} detail={detail} options={options} busy={busy}
          onSave={async (review, approve) => mutate(async () => {
            const saved = await incidentsApi.review(incident.id, review);
            onChange(saved);
            return approve ? incidentsApi.approve(incident.id, saved.incident.version) : saved;
          }, approve ? 'Registro oficial confirmado.' : 'Cambios guardados.')} />}
        <IncidentRegistrationReview key={`registration:${incident.id}:${incident.version}`} detail={detail} coordinator={coordinator} busy={busy}
          onReturn={(reason) => mutate(() => incidentsApi.requestCorrection(incident.id,incident.version,reason),'Corrección solicitada al remitente.')}
          onResubmit={(report) => mutate(() => incidentsApi.resubmit(incident.id,incident.version,report),'Reporte corregido y reenviado.')} />
        {coordinator && !resolved && <IncidentPreviousCases incidentId={incident.id} disabled={busy} />}
        {!incident.approvedAt && !coordinator && incident.status.code === 'PENDING_APPROVAL' && <Card><p>Tu información fue recibida. Está pendiente de revisión y registro oficial por el coordinador.</p></Card>}
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
    </div>
  </div>;
}
