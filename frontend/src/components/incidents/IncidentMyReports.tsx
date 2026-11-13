'use client';

import Link from 'next/link';
import { Button,LoadingSkeleton,StatusBadge } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useRequest } from '@/hooks/useRequest';
import { incidentsApi } from '@/lib/incidents-api';
import { incidentDate } from '@/lib/incidentNavigation';
import { useState } from 'react';
import { IncidentIcon, IncidentPanel, IncidentStat } from './IncidentPresentation';

export function IncidentMyReports({ compact = false }: { compact?: boolean }) {
  const {user}=useAuth();
  const [revision,setRevision]=useState(0);
  const request=useRequest(user ? `${user.id}:my-reports:${revision}` : null,() => incidentsApi.mine());
  const row = (i: NonNullable<typeof request.data>['recent'][number]) => <li key={i.id} className="border-b border-neutral-100 last:border-0">
    <Link href={`/incidencias/${i.id}`} className={`grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-5 py-3 hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-brand-600 ${compact ? '' : 'sm:grid-cols-[80px_minmax(0,1fr)_auto_16px]'}`}>
      <span className="text-xs font-semibold text-brand-800">{i.officialCode ?? `Reporte #${i.id}`}</span>
      <span className={`col-span-2 row-start-2 min-w-0 truncate text-sm font-medium ${compact ? '' : 'sm:col-span-1 sm:col-start-2 sm:row-start-1'}`} title={i.description}>{i.description}</span>
      <span className={`col-start-2 row-start-1 justify-self-end ${compact ? '' : 'sm:col-start-3'}`}><StatusBadge code={i.status.code} label={i.status.label}/></span>
      {!compact && <span className="col-start-4 row-start-1 hidden text-neutral-500 sm:block"><IncidentIcon name="arrow" /></span>}
      <span className={`col-span-2 text-xs text-neutral-600 ${compact ? '' : 'sm:col-span-1 sm:col-start-2'}`}>{incidentDate(i.createdAt)}</span>
    </Link>
  </li>;
  return <section className="space-y-5" aria-label="Mis reportes">
    {request.loading ? <LoadingSkeleton variant="card" /> : request.errorMessage ? <div role="alert"><p>{request.errorMessage}</p><Button size="lg" onClick={() => setRevision(v => v+1)}>Reintentar mis reportes</Button></div> : request.data && <>
      {!compact && <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <IncidentStat label="Total" value={request.data.total} caption="Reportes enviados por ti" tone="primary" icon="report" />
        <IncidentStat label="Sin registro oficial" value={request.data.pendingRegistration} caption="Pendientes de revisión" tone="amber" icon="clock" />
        <IncidentStat label="Activos" value={request.data.active} caption="Tus casos aún abiertos" tone="blue" icon="work" />
        <IncidentStat label="Resueltos" value={request.data.resolved} caption="Resolución validada" tone="green" icon="check" />
      </div>}
      <IncidentPanel title="Mis reportes" aside={<span className="text-xs text-neutral-600">Solo tus envíos</span>}>
        {!request.data.recent.length ? <p className="p-5 text-xs text-neutral-600">Todavía no has enviado reportes.</p> : <>
          <ul>{request.data.recent.slice(0,3).map(row)}</ul>
          {request.data.recent.length > 3 && <details className="border-t border-neutral-100"><summary className="cursor-pointer px-5 py-3 text-[13px] font-medium text-brand-800">Ver {request.data.recent.length - 3} reportes más</summary><ul>{request.data.recent.slice(3).map(row)}</ul></details>}
        </>}
        <p className="border-t border-neutral-100 px-5 py-3 text-xs text-neutral-600">Solo los enviados por ti; no incluye los reportes de otras personas de tu cuadrilla.</p>
      </IncidentPanel>
    </>}
  </section>;
}
