'use client';
import type { InterventionHistoryEvent } from '@/lib/interventions-api';

const actions:Record<string,string>={CREATED:'Actividad creada',PLANNING_UPDATED:'Planificación actualizada',ASSIGNED:'Responsable registrado',STARTED:'Trabajo iniciado',PROGRESS_SAVED:'Avance registrado',COMPLETED:'Ejecución registrada',VALIDATED:'Aprobación registrada',OBSERVED:'Corrección solicitada',REOPENED:'Trabajo retomado',CANCELLED:'Actividad cancelada',INCIDENT_LINKED:'Incidencia vinculada',INCIDENT_UNLINKED:'Vínculo con incidencia retirado'};
export function ActivityPreviousHistory({events,reports=[]}:{events:InterventionHistoryEvent[];reports?:{locationId:number;description:string;actorName:string|null;occurredAt:string|null}[]}) {
  if(!events.length&&!reports.length)return null;
  return <section className="surface-card space-y-3" aria-label="Historial conservado"><h2 className="text-lg font-semibold">Historial conservado</h2>
    <p className="text-sm">Se mantienen los registros anteriores con sus autores y fechas.</p>
    <ol className="space-y-3">{events.map((e,i)=><li key={e.id??i} className="rounded-md border border-neutral-200 p-3">
      <p className="font-medium">{actions[e.actionCode]??'Cambio registrado'} · {e.actorName??'Usuario registrado'}</p>
      <time className="text-sm">{new Date(e.occurredAt).toLocaleString('es-PE',{timeZone:'America/Lima'})}</time>
      {e.progress?.notes&&<p className="whitespace-pre-wrap">{e.progress.notes}</p>}{e.reason&&<p className="whitespace-pre-wrap">{e.reason}</p>}
    </li>)}</ol>
    {reports.map(r=><div key={r.locationId} className="rounded-md border border-neutral-200 p-3"><p className="font-medium">Reporte anterior · {r.actorName??'Autor no registrado'}</p>
      {r.occurredAt&&<time className="text-sm">{new Date(r.occurredAt).toLocaleString('es-PE',{timeZone:'America/Lima'})}</time>}<p className="whitespace-pre-wrap">{r.description}</p></div>)}
  </section>;
}
