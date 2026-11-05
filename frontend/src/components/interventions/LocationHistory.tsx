import type { InterventionHistoryEvent } from '@/lib/interventions-api';

type Props = { locationId?: number; history: InterventionHistoryEvent[]; fallbackReason?: string | null };
const date = (value: string) => new Date(value).toLocaleString('es-PE');

export function LocationObservations({ locationId, history, fallbackReason }: Props) {
  const observations = history.filter(event => event.interventionLocationId === locationId && event.actionCode === 'OBSERVED' && event.reason);
  if (!observations.length) return fallbackReason ? <p className="rounded-md border border-action-danger p-3">Observación: {fallbackReason}</p> : null;
  return <section className="space-y-2 rounded-md border border-neutral-200 p-3" aria-label="Observaciones de revisión">
    <h4 className="font-medium">Observaciones de revisión</h4>
    <p className="text-sm text-neutral-500">Se conservan para consultar qué debe subsanarse y lo solicitado en intentos anteriores.</p>
    <ol className="space-y-3">{observations.map((event,index) => <li key={event.id ?? index}>
      <p className="text-sm text-neutral-500">{date(event.occurredAt)}{event.attemptNumber != null && ` · intento ${event.attemptNumber}`}{event.actorName && ` · ${event.actorName}`}</p>
      <p className="whitespace-pre-wrap">{event.reason}</p>
    </li>)}</ol>
  </section>;
}

export function LocationProgressHistory({ locationId, history, unit }: Props & { unit: (id: number | null | undefined) => string }) {
  const reports = history.filter(event => event.interventionLocationId === locationId && event.actionCode === 'PROGRESS_SAVED');
  return <details open className="rounded-md border border-neutral-200 p-3">
    <summary className="cursor-pointer font-medium">Historial de avances ({reports.length})</summary>
    {!reports.length ? <p className="mt-2 text-sm text-neutral-500">Todavía no se han registrado avances en esta ubicación.</p> :
      <ol aria-label="Avances registrados" className="mt-3 space-y-3">{reports.map((event,index) => <li key={event.id ?? index} className="space-y-1 border-b border-neutral-100 pb-2">
        <p className="text-sm text-neutral-500">{date(event.occurredAt)}{event.attemptNumber != null && ` · intento ${event.attemptNumber}`}{event.actorName && ` · ${event.actorName}`}</p>
        {event.progress ? <>
          <p>Avance acumulado: {event.progress.quantity ?? 'Sin cantidad registrada'} {unit(event.progress.unitItemId)}</p>
          {event.progress.previousQuantity != null && <p className="text-sm text-neutral-500">Acumulado anterior: {event.progress.previousQuantity} {unit(event.progress.unitItemId)}</p>}
          {event.progress.notes && <p className="whitespace-pre-wrap">{event.progress.notes}</p>}
        </> : <p className="text-sm">Avance registrado.</p>}
      </li>)}</ol>}
  </details>;
}
