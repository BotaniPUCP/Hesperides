'use client';

import { useRef, useState } from 'react';
import type { IncidentDetail, IncidentOptions } from '@shared/types';
import { Button, Card, LoadingSkeleton } from '@/components/ui';
import { incidentsApi } from '@/lib/incidents-api';
import { mensajeDeApiError } from '@/lib/api-errors';
import { incidentDate } from '@/lib/incidentNavigation';
import { IncidentBadges } from './IncidentBadges';
import { IncidentCommunication } from './IncidentCommunication';
import { IncidentPhotos } from './IncidentPhotos';
import { IncidentPrefillCard } from './IncidentPrefillCard';
import { IncidentActivationCard } from './IncidentActivationCard';
import { IncidentReviewForm } from './IncidentReviewForm';
import { IncidentWorkLinks } from './IncidentWorkLinks';
import { IncidentClosureCard } from './IncidentClosureCard';

function Received({ detail }: { detail: IncidentDetail }) {
  const i = detail.incident;
  return <Card title="Lo que se reportó">
    <blockquote className="whitespace-pre-wrap break-words rounded-md bg-neutral-50 p-3">{i.originalDescription}</blockquote>
    <dl className="mt-4 space-y-2 text-sm text-neutral-700">
      <div><dt className="font-medium">Enviado por</dt><dd>{i.reportedBy.fullName} · {incidentDate(i.createdAt)}</dd></div>
      <div><dt className="font-medium">Gravedad marcada</dt><dd>{i.reportedUrgency?.label ?? 'Sin indicar'}</dd></div>
      <div><dt className="font-medium">Pedido de</dt><dd>{i.requestedBy.organizationName ?? i.requestedBy.name}</dd></div>
      <div><dt className="font-medium">Ubicación</dt><dd className="break-words">{[i.zone?.name, i.locationReference].filter(Boolean).join(' · ') || 'Sin ubicar'}</dd></div>
      <div><dt className="font-medium">Cuadrilla</dt><dd>{i.team?.name ?? 'Sin asignar'}</dd></div>
      {i.provider && <div><dt className="font-medium">Tercero</dt><dd>{i.provider.name} · {i.agreedDays} días pactados</dd></div>}
      {i.activatedAt && <div><dt className="font-medium">Activada</dt><dd>{i.activatedBy?.fullName} · {incidentDate(i.activatedAt)}</dd></div>}
    </dl>
  </Card>;
}

export function IncidentDetailPanel({ detail, options, optionsLoading, coordinator, onChange, onReload, createInterventionHref }: {
  detail: IncidentDetail; options: IncidentOptions | null; optionsLoading: boolean; coordinator: boolean;
  onChange: (detail: IncidentDetail) => void; onReload: () => void; createInterventionHref: string;
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
  const id = incident.id;
  const version = incident.version;

  return <div className="space-y-6">
    <header className="surface-card flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-2">
        <h1 className="page-title">{incident.code}</h1>
        {incident.title && <p className="text-lg font-semibold text-neutral-900">{incident.title}</p>}
        <IncidentBadges incident={incident} />
      </div>
      <Button variant="secondary" size="lg" disabled={busy} onClick={onReload}>Actualizar detalle</Button>
    </header>
    {message && <p role="status" className="rounded-lg border border-alert-success-border bg-alert-success-bg p-3 text-alert-success-fg">{message}</p>}
    {error && <p role="alert" className="rounded-lg bg-alert-danger-bg p-3 text-alert-danger-fg">{error}</p>}
    {!coordinator && !incident.active && !incident.closedAt && <Card>
      <p>Tu reporte fue recibido. Coordinación lo revisará y lo activará para atenderlo.</p></Card>}
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
      <div className="min-w-0 space-y-5">
        <Received detail={detail} />
        <IncidentPhotos incidentId={id} photos={detail.photos} />
        <IncidentCommunication updates={detail.updates} busy={busy}
          onComment={(body, reference) => mutate(() => incidentsApi.comment(id, body, reference), 'Comentario recibido.')} />
        <Card title="Historial"><ol className="space-y-4">{detail.history.map((entry) => <li key={entry.id} className="border-l-2 border-neutral-200 pl-3 text-sm">
          <p className="font-medium">{entry.status.label}</p><p>{entry.changedBy.fullName}</p><p className="text-neutral-700">{incidentDate(entry.createdAt)}</p>
        </li>)}</ol></Card>
      </div>
      <div className="min-w-0 space-y-5">
        {coordinator && <IncidentPrefillCard detail={detail} options={options} busy={busy}
          onRetry={() => void mutate(() => incidentsApi.retryPrefill(id), 'Se pidió otra sugerencia a la IA.')} />}
        {coordinator && !incident.active && !incident.closedAt && <IncidentActivationCard detail={detail} busy={busy}
          onActivate={() => void mutate(() => incidentsApi.activate(id, version), 'Incidencia activada.')} />}
        {coordinator && detail.capabilities.canEdit && (optionsLoading ? <LoadingSkeleton variant="card" /> : options &&
          <IncidentReviewForm key={`${id}:${version}`} detail={detail} options={options} busy={busy}
            onSave={(review) => mutate(() => incidentsApi.review(id, review), 'Cambios guardados.')} />)}
        {(incident.active || detail.linkedInterventions.length > 0) && <IncidentWorkLinks detail={detail} busy={busy} createHref={createInterventionHref}
          onLink={(workId) => mutate(() => incidentsApi.link(id, version, workId), 'Intervención vinculada.')}
          onRemove={(linkId, reason) => mutate(() => incidentsApi.unlink(id, linkId, version, reason), 'Vínculo quitado; la intervención se conserva.')}
          onReplace={(linkId, workId, reason) => mutate(() => incidentsApi.replace(id, linkId, version, workId, reason), 'Intervención reemplazada.')} />}
        {coordinator && (incident.active || incident.closedAt) && <IncidentClosureCard detail={detail} busy={busy}
          onClose={(summary) => mutate(() => incidentsApi.close(id, version, summary), 'Incidencia cerrada.')} />}
      </div>
    </div>
  </div>;
}
