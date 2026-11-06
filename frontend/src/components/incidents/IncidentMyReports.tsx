'use client';

import Link from 'next/link';
import { Card,Button,LoadingSkeleton,StatusBadge } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useRequest } from '@/hooks/useRequest';
import { incidentsApi } from '@/lib/incidents-api';
import { incidentDate } from '@/lib/incidentNavigation';
import { useState } from 'react';

export function IncidentMyReports() {
  const {user}=useAuth();
  const [revision,setRevision]=useState(0);
  const request=useRequest(user ? `${user.id}:my-reports:${revision}` : null,() => incidentsApi.mine());
  return <Card title="Mis reportes">
    <p className="mb-4 text-sm text-neutral-700">Solo los enviados por ti; no incluye los reportes de otras personas de tu cuadrilla.</p>
    {request.loading ? <LoadingSkeleton variant="card" /> : request.errorMessage ? <div role="alert"><p>{request.errorMessage}</p><Button size="lg" onClick={() => setRevision(v => v+1)}>Reintentar mis reportes</Button></div> : request.data && <>
      <dl className="mb-4 grid grid-cols-2 gap-3 text-sm">{[['Total',request.data.total],['Sin registro oficial',request.data.pendingRegistration],['Activos',request.data.active],['Resueltos',request.data.resolved]].map(([label,count]) => <div key={label}><dt className="text-neutral-700">{label}</dt><dd className="text-xl font-semibold">{count}</dd></div>)}</dl>
      {!request.data.recent.length ? <p className="text-sm text-neutral-700">Todavía no has enviado reportes.</p> : <ul className="divide-y divide-neutral-200">{request.data.recent.map(i => <li key={i.id} className="py-4">
        <Link href={`/incidencias/${i.id}`} className="block space-y-2 rounded-md focus-visible:ring-2 focus-visible:ring-brand-600">
          <div className="flex flex-wrap justify-between gap-2"><span className="font-medium text-brand-700">{i.officialCode ?? `Reporte #${i.id}`}</span><StatusBadge code={i.status.code} label={i.status.label}/></div>
          <p className="line-clamp-2 break-words text-sm">{i.description}</p><p className="text-xs text-neutral-700">{incidentDate(i.createdAt)}</p>
        </Link>
      </li>)}</ul>}
    </>}
  </Card>;
}
