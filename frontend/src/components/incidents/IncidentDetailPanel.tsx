'use client';

import { useRef, useState } from 'react';
import type { IncidentDetail, IncidentOptions, IncidentPhoto, IncidentReview } from '@shared/types';
import { Button, Card, LoadingSkeleton, Select, StatusBadge, Textarea, UrgencyBadge, type UrgencyCode } from '@/components/ui';
import { useRequest } from '@/hooks/useRequest';
import { incidentsApi, newClientReference } from '@/lib/incidents-api';
import { mensajeDeApiError } from '@/lib/api-errors';
import { incidentDate } from '@/lib/incidentNavigation';
import { LocationFields, locationPayload } from './LocationFields';

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
  onSave: (review: IncidentReview, approve: boolean) => Promise<void>;
}) {
  const incident = detail.incident;
  const [description, setDescription] = useState(incident.description);
  const [location, setLocation] = useState({ reference: incident.locationReference ?? '', latitude: incident.latitude?.toString() ?? '', longitude: incident.longitude?.toString() ?? '' });
  const [type, setType] = useState<string | null>(incident.type?.code ?? (incident.approvedAt ? null : detail.suggestedType?.code ?? null));
  const [urgency, setUrgency] = useState<string | null>(incident.urgency?.code ?? null);
  const [teamId, setTeamId] = useState(incident.team?.id.toString() ?? '');
  const [error, setError] = useState('');
  const [descriptionError, setDescriptionError] = useState('');
  const save = (approve: boolean) => {
    if (!description.trim()) { setDescriptionError('La descripción no puede quedar vacía.'); return; }
    setDescriptionError('');
    try {
      const review = { description: description.trim(), ...locationPayload(location), version: incident.version,
        typeCode: type, urgencyCode: urgency, teamId: teamId ? Number(teamId) : null };
      setError(''); void onSave(review, approve);
    } catch (ex) { setError((ex as Error).message); }
  };
  return <Card title={incident.approvedAt ? 'Datos de atención' : 'Revisión del registro'}>
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save(false); }}>
      <Textarea id="review-description" label="Descripción" value={description} rows={4} maxLength={10000} disabled={busy} required
        errorMessage={descriptionError} onChange={(value) => { setDescription(value); setDescriptionError(''); }} />
      <p className="text-sm text-neutral-700">Categorías provisionales para revisar con el cliente. Puedes dejar sin clasificar lo que aún no se conoce.</p>
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
      {error && <p role="alert" className="rounded-md bg-alert-danger-bg p-3 text-sm text-alert-danger-fg">{error}</p>}
      <div className="flex flex-wrap gap-3">
        {!incident.approvedAt && <Button type="button" size="lg" loading={busy} onClick={() => save(true)}>Aprobar registro</Button>}
        <Button type="submit" size="lg" variant={incident.approvedAt ? 'primary' : 'secondary'} disabled={busy}>Guardar cambios</Button>
      </div>
    </form>
  </Card>;
}

function WorkForm({ coordinator, options, busy, onAdd }: {
  coordinator: boolean; options: IncidentOptions; busy: boolean;
  onAdd: (description: string, type: string | null, completed: boolean, reference: string) => Promise<boolean>;
}) {
  const [description, setDescription] = useState('');
  const [type, setType] = useState<string | null>(null);
  const [completed, setCompleted] = useState(true);
  const [descriptionError, setDescriptionError] = useState('');
  const attempt = useRef<{ json: string; reference: string } | null>(null);
  return <form className="space-y-4 border-t border-neutral-200 pt-4" onSubmit={async (e) => {
    e.preventDefault();
    if (!description.trim()) { setDescriptionError('Describe brevemente el trabajo.'); return; }
    setDescriptionError('');
    const json = JSON.stringify([description.trim(), type, completed]);
    if (attempt.current?.json !== json) attempt.current = { json, reference: newClientReference() };
    if (await onAdd(description.trim(), type, completed, attempt.current.reference)) {
      setDescription(''); setType(null); attempt.current = null;
    }
  }}>
    <Textarea id="work-description" label="¿Qué trabajo se realizó o se necesita?" rows={3} value={description} disabled={busy} maxLength={10000} required
      errorMessage={descriptionError} onChange={(value) => { setDescription(value); setDescriptionError(''); }} />
    <Select id="work-type" label="Actividad (opcional)" size="lg" value={type} options={options.activities} onChange={(v) => setType(v?.code ?? null)} clearable disabled={busy} placeholder="Sin clasificar" />
    {coordinator && <label className="flex min-h-12 items-center gap-3 text-sm"><input type="checkbox" checked={completed} disabled={busy} onChange={(e) => setCompleted(e.target.checked)} />Trabajo ya realizado</label>}
    <Button type="submit" size="lg" loading={busy}>{completed ? 'Registrar trabajo realizado' : 'Planificar intervención'}</Button>
  </form>;
}

export function IncidentDetailPanel({ detail, options, optionsLoading, coordinator, onChange, onReload }: {
  detail: IncidentDetail; options: IncidentOptions | null; optionsLoading: boolean; coordinator: boolean;
  onChange: (detail: IncidentDetail) => void; onReload: () => void;
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
  const canResolve = detail.interventions.length > 0 && detail.interventions.every((w) => w.status.code === 'COMPLETED');

  return <div className="space-y-5">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-2"><h1 className="text-2xl font-extrabold tracking-tight text-neutral-900">Incidencia #{incident.id}</h1>
        <div className="flex flex-wrap gap-2"><StatusBadge code={incident.status.code} label={incident.status.label} />
          {incident.urgency && <UrgencyBadge code={incident.urgency.code as UrgencyCode} label={incident.urgency.label} />}
        </div>
      </div>
      <Button variant="secondary" size="lg" disabled={busy} onClick={onReload}>Actualizar detalle</Button>
    </header>
    <p className="whitespace-pre-wrap break-words text-lg text-neutral-900">{incident.description}</p>
    {message && <p role="status" className="rounded-lg border border-alert-success-border bg-alert-success-bg p-3 text-alert-success-fg">{message}</p>}
    {error && <p role="alert" className="rounded-lg bg-alert-danger-bg p-3 text-alert-danger-fg">{error}</p>}
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
            {incident.approvedAt && <div><dt className="font-medium">Aprobada por</dt><dd>{incident.approvedBy?.fullName} · {incidentDate(incident.approvedAt)}</dd></div>}
          </dl>
        </Card>
        {detail.photos.length > 0 && <Card title="Fotografías"><div className="space-y-5">{detail.photos.map((photo) => <Photo key={photo.id} incidentId={incident.id} photo={photo} />)}</div></Card>}
        <Card title="Historial"><ol className="space-y-4">{detail.history.map((entry) => <li key={entry.id} className="border-l-2 border-neutral-200 pl-3 text-sm">
          <p className="font-medium">{entry.status.label}</p><p>{entry.changedBy.fullName}</p><p className="text-neutral-700">{incidentDate(entry.createdAt)}</p>
        </li>)}</ol></Card>
      </div>
      <div className="min-w-0 space-y-5">
        {optionsLoading && !resolved && <LoadingSkeleton variant="card" />}
        {coordinator && !resolved && options && <ReviewForm key={`${incident.id}:${incident.version}`} detail={detail} options={options} busy={busy}
          onSave={async (review, approve) => { await mutate(async () => {
            const saved = await incidentsApi.review(incident.id, review);
            onChange(saved);
            return approve ? incidentsApi.approve(incident.id, saved.incident.version) : saved;
          }, approve ? 'Registro aprobado.' : 'Cambios guardados.'); }} />}
        {!incident.approvedAt && !coordinator && <Card><p>Tu información fue recibida. Está pendiente de aprobación por el coordinador.</p></Card>}
        <Card title="Intervenciones vinculadas">
          {detail.interventions.length === 0 ? <p className="mb-4 text-sm text-neutral-700">Todavía no se registraron intervenciones.</p> : <ul className="mb-5 space-y-4">
            {detail.interventions.map((work) => <li key={work.id} className="space-y-2 rounded-lg border border-neutral-200 p-3">
              <StatusBadge code={work.status.code} label={work.status.label} />
              <p className="whitespace-pre-wrap break-words">{work.description}</p>
              <p className="text-sm text-neutral-700">{work.type?.label ?? 'Sin clasificar'} · {work.recordedBy.fullName}</p>
              {work.completedAt && <p className="text-sm text-neutral-700">Realizada: {incidentDate(work.completedAt)} · {work.completedBy?.fullName}</p>}
              {canWork && !work.completedAt && <Button variant="secondary" size="lg" disabled={busy}
                onClick={() => void mutate(() => incidentsApi.completeIntervention(incident.id, work.id), 'Intervención marcada como realizada.')}>Marcar realizada</Button>}
            </li>)}
          </ul>}
          {canWork && options && <WorkForm coordinator={coordinator} options={options} busy={busy}
            onAdd={(description, typeCode, completed, clientReference) => mutate(() => incidentsApi.addIntervention(incident.id, { description, typeCode, completed, clientReference }), 'Intervención registrada.')} />}
        </Card>
        {canWork && <Card title="Estado de atención"><div className="space-y-3">
          {incident.status.code === 'OPEN' && <Button variant="secondary" size="lg" disabled={busy} onClick={() => void mutate(() => incidentsApi.start(incident.id), 'Atención iniciada.')}>Iniciar atención</Button>}
          {!canResolve && <p className="text-sm text-neutral-700">Para resolver, registra el trabajo realizado y completa las intervenciones pendientes.</p>}
          <Button size="lg" disabled={busy || !canResolve} onClick={() => void mutate(() => incidentsApi.resolve(incident.id), 'Incidencia resuelta.')}>Resolver incidencia</Button>
        </div></Card>}
      </div>
    </div>
  </div>;
}
