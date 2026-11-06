'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { ComplianceStatus } from '@shared/types';
import { Button, Card } from '@/components/ui';
import { useListUrlState } from '@/hooks/useListUrlState';
import { useRequest } from '@/hooks/useRequest';
import { isoDateFrom } from '@/lib/listUrl';
import { maintenanceApi } from '@/lib/maintenance-api';
import { FREQUENCIES_PATH, FREQUENCY_LIST_DEFAULTS } from './frequencyListState';

const labels:Record<ComplianceStatus,string> = {
  ON_TARGET:'En plazo',WITHIN_TOLERANCE:'Dentro de tolerancia',OVERDUE:'Fuera de plazo',
  NOT_APPLICABLE:'Sin evaluación aplicable',NOT_CONFIGURED:'Sin frecuencia configurada',
};

const isValidPeriod = (from:string,to:string) => Boolean(from && to && to >= from);

/** El periodo consultado vive en la URL: al regresar de una intervención, el reporte vuelve a cargarse. */
export function LocationCompliancePanel() {
  const { values, setValues } = useListUrlState(FREQUENCIES_PATH, FREQUENCY_LIST_DEFAULTS);
  const consultedFrom = isoDateFrom(values.from);
  const consultedTo = isoDateFrom(values.to);
  const urlPeriod = `${consultedFrom}:${consultedTo}`;
  const [from,setFrom] = useState(consultedFrom);
  const [to,setTo] = useState(consultedTo);
  const [seenPeriod,setSeenPeriod] = useState(urlPeriod);
  const [invalid,setInvalid] = useState(false);
  const [revision,setRevision] = useState(0);

  // Si la URL cambia desde afuera (el menú lateral), los campos la siguen.
  if (urlPeriod !== seenPeriod) {
    setSeenPeriod(urlPeriod);
    setFrom(consultedFrom);
    setTo(consultedTo);
    setInvalid(false);
  }

  const compliance = useRequest(
    isValidPeriod(consultedFrom,consultedTo) ? `${urlPeriod}:${revision}` : null,
    () => maintenanceApi.getCompliance(consultedFrom,consultedTo),
  );
  const reports = compliance.data;
  const loading = compliance.loading;
  const error = invalid ? 'Selecciona un periodo válido.'
    : compliance.notFound ? 'No se encontró el reporte de cumplimiento.' : compliance.errorMessage;

  const query = (event:React.FormEvent) => {
    event.preventDefault();
    if (!isValidPeriod(from,to)) {setInvalid(true);return;}
    setInvalid(false);
    if (from === consultedFrom && to === consultedTo) setRevision(n=>n+1);
    else setValues({from,to});
  };
  return <Card title="Cumplimiento por lugar atendido">
    <p className="mb-4 text-sm text-neutral-500">Según los permisos de tu cuenta, se consideran trabajos con aprobación final. La fecha de ejecución mide el intervalo; la de aprobación conserva la aceptación. Cada actividad cuenta una vez por lugar aunque tenga varias unidades locales. No se infiere cobertura de otros jardines.</p>
    <form onSubmit={query} className="flex flex-wrap items-end gap-3">
      <label htmlFor="compliance-from" className="grid gap-1 text-sm">Fecha inicial<input id="compliance-from" type="date" className="h-11 rounded-md border border-neutral-200 p-2" value={from} onChange={e=>setFrom(e.target.value)} required disabled={loading}/></label>
      <label htmlFor="compliance-to" className="grid gap-1 text-sm">Fecha final<input id="compliance-to" type="date" className="h-11 rounded-md border border-neutral-200 p-2" value={to} onChange={e=>setTo(e.target.value)} required disabled={loading}/></label>
      <Button type="submit" loading={loading}>Consultar cumplimiento por lugar</Button>
    </form>
    {error && <p role="alert" className="mt-3 text-action-danger">{error}</p>}
    {reports?.length === 0 && <p className="mt-3">No hay frecuencias configuradas para evaluar.</p>}
    <div className="mt-4 space-y-4">{reports?.map((report,index)=><article key={`${report.activityTypeItemId}-${report.regime}-${index}`} className="space-y-3 rounded-md border border-neutral-200 p-4">
      <h3 className="font-semibold">{report.activityTypeLabel} · {report.regime === 'IN_HOUSE' ? 'Personal propio' : 'Tercerizado'}</h3>
      <p className="text-sm">Periodo consultado: {report.from} a {report.to}</p>
      {report.locations?.length ? report.locations.map(location=><section key={`${location.targetKind}:${location.targetId}`} className="space-y-2 border-t border-neutral-200 pt-3">
        <h4 className="font-medium">{location.targetLabel}</h4>
        {location.segments.map((segment,i)=><p key={i} className="text-sm">{labels[segment.status]} · {segment.explanation}{segment.lastExecutionDate ? ` · Última ejecución: ${segment.lastExecutionDate}` : ''}</p>)}
        <ul aria-label={`Ejecuciones de ${location.targetLabel}`} className="space-y-2 text-sm">{location.executions.map(fact=><li key={`${fact.interventionId}:${fact.locationId}:${fact.attemptNumber}`}>
          <Link className="text-brand-600 underline" href={`/intervenciones/${fact.interventionId}`}>{fact.interventionCode}</Link>
          {' · '}Ejecución: {fact.executionDate}{' · '}Aprobación final: {fact.approvalDate}{' · '}Intento {fact.attemptNumber}
        </li>)}</ul>
      </section>) : report.segments.map((segment,i)=><p key={i} className="text-sm">{labels[segment.status]} · {segment.explanation}</p>)}
    </article>)}</div>
  </Card>;
}
