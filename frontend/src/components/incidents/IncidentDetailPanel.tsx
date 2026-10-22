'use client';

import { useEffect, useRef, useState } from 'react';
import type { IncidentDetail, IncidentOptions, IncidentPhoto, IncidentReview } from '@shared/types';
import { Button, Card, Select, StatusBadge } from '@/components/ui';
import { incidentsApi, newClientReference } from '@/lib/incidents-api';
import { mensajeDeApiError } from '@/lib/api-errors';
import { LocationFields, locationPayload } from './LocationFields';

export function incidentDate(date: string) {
  return new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(date));
}

function Photo({ incidentId, photo }: { incidentId: number; photo: IncidentPhoto }) {
  const [source, setSource] = useState('');
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    incidentsApi.photo(incidentId, photo.id).then((data) => {
      if (active) { setSource(`data:${data.contentType};base64,${data.base64}`); setError(''); }
    }).catch((ex) => { if (active) setError(mensajeDeApiError(ex)); });
    return () => { active = false; };
  }, [incidentId, photo.id, retry]);
  return <figure className="space-y-2">
    {/* Authenticated image bytes are loaded through the central API client. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {source ? <img src={source} alt={`Evidencia de la incidencia ${incidentId}, fotografía ${photo.id}`} className="max-h-96 w-full rounded-md object-contain" />
      : !error && <p className="text-sm text-neutral-500">Cargando fotografía…</p>}
    {error && <div role="alert"><p>{error}</p><Button variant="secondary" size="lg" onClick={() => setRetry((v) => v + 1)}>Reintentar foto</Button></div>}
    <figcaption className="text-xs text-neutral-500">Recibida: {incidentDate(photo.createdAt)}</figcaption>
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
  const save = (approve: boolean) => {
    if (!description.trim()) { setError('La descripción no puede quedar vacía.'); return; }
    try {
      const review = { description: description.trim(), ...locationPayload(location), version: incident.version,
        typeCode: type, urgencyCode: urgency, teamId: teamId ? Number(teamId) : null };
      setError(''); void onSave(review, approve);
    } catch (ex) { setError((ex as Error).message); }
  };
  return <Card title={incident.approvedAt ? 'Datos de atención' : 'Revisión del registro'}>
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save(false); }}>
      <label className="block text-sm font-medium">Descripción
        <textarea value={description} rows={4} maxLength={10000} disabled={busy}
          className="mt-1 w-full rounded-md border border-neutral-200 p-3 text-base" onChange={(e) => setDescription(e.target.value)} />
      </label>
      <p className="text-sm text-neutral-500">Categorías provisionales para revisar con el cliente. Puedes dejar sin clasificar lo que aún no se conoce.</p>
      {detail.suggestedType && !incident.approvedAt && <p className="text-sm text-brand-700">Sugerencia por el texto: {detail.suggestedType.label}. Confirma o cambia la selección.</p>}
      <Select id="review-type" label="Tipo de incidencia" options={options.types} value={type} onChange={(v) => setType(v?.code ?? null)} clearable disabled={busy} placeholder="Sin clasificar" />
      <Select id="review-urgency" label="Urgencia" options={options.urgencies} value={urgency} onChange={(v) => setUrgency(v?.code ?? null)} clearable disabled={busy} placeholder="Sin evaluar" />
      <label className="block text-sm font-medium">Cuadrilla responsable
        <select value={teamId} disabled={busy} onChange={(e) => setTeamId(e.target.value)} className="mt-1 min-h-12 w-full rounded-md border border-neutral-200 px-3 text-base">
          <option value="">Sin asignar</option>
          {incident.team && !options.teams.some((t) => t.id === incident.team?.id) && <option value={incident.team.id}>{incident.team.name} (no disponible)</option>}
          {options.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </label>
      {options.teams.length === 0 && <p className="text-sm text-neutral-500">Todavía no hay cuadrillas activas configuradas. Puedes aprobar y asignar después.</p>}
      <LocationFields value={location} onChange={setLocation} disabled={busy} />
      {error && <p role="alert" className="text-sm text-action-danger">{error}</p>}
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
  const [error, setError] = useState('');
  const attempt = useRef<{ json: string; reference: string } | null>(null);
  return <form className="space-y-4 border-t border-neutral-200 pt-4" onSubmit={async (e) => {
    e.preventDefault();
    if (!description.trim()) { setError('Describe brevemente el trabajo.'); return; }
    setError('');
    const json = JSON.stringify([description.trim(), type, completed]);
    if (attempt.current?.json !== json) attempt.current = { json, reference: newClientReference() };
    if (await onAdd(description.trim(), type, completed, attempt.current.reference)) {
      setDescription(''); setType(null); attempt.current = null;
    }
  }}>
    <label className="block text-sm font-medium">¿Qué trabajo se realizó o se necesita?
      <textarea rows={3} value={description} disabled={busy} maxLength={10000}
        className="mt-1 w-full rounded-md border border-neutral-200 p-3 text-base" onChange={(e) => setDescription(e.target.value)} />
    </label>
    <Select id="work-type" label="Actividad (opcional)" value={type} options={options.activities} onChange={(v) => setType(v?.code ?? null)} clearable disabled={busy} placeholder="Sin clasificar" />
    {coordinator && <label className="flex min-h-12 items-center gap-3 text-sm"><input type="checkbox" checked={completed} disabled={busy} onChange={(e) => setCompleted(e.target.checked)} />Trabajo ya realizado</label>}
    {error && <p role="alert" className="text-sm text-action-danger">{error}</p>}
    <Button type="submit" size="lg" loading={busy}>{completed ? 'Registrar trabajo realizado' : 'Planificar intervención'}</Button>
  </form>;
}

export function IncidentDetailPanel({ detail, options, coordinator, onChange, onBack, onReload }: {
  detail: IncidentDetail; options: IncidentOptions; coordinator: boolean;
  onChange: (detail: IncidentDetail) => void; onBack: () => void; onReload: () => void;
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
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Button variant="ghost" size="lg" disabled={busy} onClick={onBack}>Volver a incidencias</Button>
      <Button variant="secondary" size="lg" disabled={busy} onClick={onReload}>Actualizar detalle</Button>
    </div>
    <header className="space-y-2"><h1 className="text-2xl font-semibold text-neutral-900">Incidencia #{incident.id}</h1>
      <StatusBadge code={incident.status.code} label={incident.status.label} />
      <p className="whitespace-pre-wrap break-words text-lg text-neutral-900">{incident.description}</p>
    </header>
    {message && <p role="status" className="rounded-lg bg-brand-50 p-3 text-brand-900">{message}</p>}
    {error && <p role="alert" className="rounded-lg border border-action-danger p-3 text-action-danger">{error}</p>}
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
      <div className="space-y-5">
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
          <p className="font-medium">{entry.status.label}</p><p>{entry.changedBy.fullName}</p><p className="text-neutral-500">{incidentDate(entry.createdAt)}</p>
        </li>)}</ol></Card>
      </div>
      <div className="space-y-5">
        {coordinator && !resolved && <ReviewForm key={`${incident.id}:${incident.version}`} detail={detail} options={options} busy={busy}
          onSave={async (review, approve) => { await mutate(async () => {
            const saved = await incidentsApi.review(incident.id, review);
            onChange(saved);
            return approve ? incidentsApi.approve(incident.id, saved.incident.version) : saved;
          }, approve ? 'Registro aprobado.' : 'Cambios guardados.'); }} />}
        {!incident.approvedAt && !coordinator && <Card><p>Tu información fue recibida. Está pendiente de aprobación por el coordinador.</p></Card>}
        <Card title="Intervenciones vinculadas">
          {detail.interventions.length === 0 ? <p className="mb-4 text-sm text-neutral-500">Todavía no se registraron intervenciones.</p> : <ul className="mb-5 space-y-4">
            {detail.interventions.map((work) => <li key={work.id} className="space-y-2 rounded-lg border border-neutral-200 p-3">
              <StatusBadge code={work.status.code} label={work.status.label} />
              <p className="whitespace-pre-wrap break-words">{work.description}</p>
              <p className="text-sm text-neutral-500">{work.type?.label ?? 'Sin clasificar'} · {work.recordedBy.fullName}</p>
              {work.completedAt && <p className="text-sm text-neutral-500">Realizada: {incidentDate(work.completedAt)} · {work.completedBy?.fullName}</p>}
              {canWork && !work.completedAt && <Button variant="secondary" size="lg" disabled={busy}
                onClick={() => void mutate(() => incidentsApi.completeIntervention(incident.id, work.id), 'Intervención marcada como realizada.')}>Marcar realizada</Button>}
            </li>)}
          </ul>}
          {canWork && <WorkForm coordinator={coordinator} options={options} busy={busy}
            onAdd={(description, typeCode, completed, clientReference) => mutate(() => incidentsApi.addIntervention(incident.id, { description, typeCode, completed, clientReference }), 'Intervención registrada.')} />}
        </Card>
        {canWork && <Card title="Estado de atención"><div className="space-y-3">
          {incident.status.code === 'OPEN' && <Button variant="secondary" size="lg" disabled={busy} onClick={() => void mutate(() => incidentsApi.start(incident.id), 'Atención iniciada.')}>Iniciar atención</Button>}
          {!canResolve && <p className="text-sm text-neutral-500">Para resolver, registra el trabajo realizado y completa las intervenciones pendientes.</p>}
          <Button size="lg" disabled={busy || !canResolve} onClick={() => void mutate(() => incidentsApi.resolve(incident.id), 'Incidencia resuelta.')}>Resolver incidencia</Button>
        </div></Card>}
      </div>
    </div>
  </div>;
}
