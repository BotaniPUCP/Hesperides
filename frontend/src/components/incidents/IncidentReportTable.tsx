'use client';

import Link from 'next/link';
import type { Incident } from '@shared/types';
import { Card,StatusBadge,UrgencyBadge,type UrgencyCode } from '@/components/ui';
import { incidentDate } from '@/lib/incidentNavigation';

export function IncidentReportTable({ incidents,href }: {incidents: Incident[];href: (path: string) => string}) {
  return <>
    <div className="space-y-3 md:hidden">{incidents.map(i => <Link key={i.id} href={href(`/incidencias/${i.id}`)} className="block rounded-md focus-visible:ring-2 focus-visible:ring-brand-600">
      <Card><div className="flex flex-wrap justify-between gap-2"><b>{i.officialCode ?? `Reporte #${i.id}`}</b><StatusBadge code={i.status.code} label={i.status.label}/></div>
        <p className="my-3 break-words font-medium">{i.description}</p>
        <p className="text-sm text-neutral-700">{i.matrix.zone?.label ?? i.locationReference ?? 'Ubicación no indicada'}</p>
        <p className="mt-2 text-sm text-neutral-700">{i.reportedBy.fullName} · {incidentDate(i.createdAt)}</p>
        <p className="mt-2 text-sm">Severidad: {i.matrix.severity?.label ?? 'Sin evaluar'} · {i.matrix.service?.label ?? 'Servicio sin determinar'}</p>
        <p className="mt-2 text-sm">{i.approvedAt ? 'Registro oficial' : 'Pendiente de registro'} · {i.matrix.responsible?.fullName ?? 'Responsable sin asignar'}</p>
      </Card>
    </Link>)}</div>
    <div className="hidden overflow-x-auto rounded-lg border border-neutral-200 md:block">
      <table className="w-full text-left text-sm"><caption className="sr-only">Resumen de reportes de incidencias</caption>
        <thead className="bg-neutral-50 text-neutral-700"><tr>{['Reporte','Ubicación','Reportado por / recibida','Clasificación','Atención','Estado / registro'].map(h => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-neutral-200 bg-neutral-0">{incidents.map(i => <tr key={i.id} className="hover:bg-neutral-50">
          <td className="max-w-sm px-4 py-4 align-top"><Link href={href(`/incidencias/${i.id}`)} className="font-semibold text-brand-700 underline">{i.officialCode ?? `Reporte #${i.id}`}</Link><p className="mt-2 break-words">{i.description}</p></td>
          <td className="max-w-xs px-4 py-4 align-top">{i.matrix.zone?.label ?? i.locationReference ?? 'Sin identificar'}<p className="mt-1 text-xs text-neutral-700">{i.matrix.zone?.sectorLabel}</p></td>
          <td className="px-4 py-4 align-top">{i.matrix.reporterName ?? i.reportedBy.fullName}<p className="mt-1 text-xs text-neutral-700">{incidentDate(i.createdAt)}</p><p className="mt-1 text-xs">{i.matrix.intakeChannel?.label ?? 'Formulario'}</p></td>
          <td className="px-4 py-4 align-top"><p>{i.matrix.event?.label ?? 'Incidencia'}</p><p className="mt-1 text-xs">{i.matrix.service?.label ?? 'Servicio sin determinar'}</p><p className="mt-1">Severidad: {i.matrix.severity?.label ?? 'Sin evaluar'}</p>
            {i.urgency && <div className="mt-2"><UrgencyBadge code={i.urgency.code as UrgencyCode} label={i.urgency.label}/></div>}</td>
          <td className="px-4 py-4 align-top">{i.matrix.responsible?.fullName ?? 'Responsable sin asignar'}<p className="mt-1 text-xs text-neutral-700">{i.team?.name ?? 'Sin cuadrilla asignada'}</p><p className="mt-1 text-xs">{i.matrix.company?.label ?? 'Empresa sin determinar'}</p></td>
          <td className="px-4 py-4 align-top"><StatusBadge code={i.status.code} label={i.status.label}/><p className="mt-2 text-xs">{i.approvedAt ? 'Registrada oficialmente' : 'Pendiente de registro'}</p>
            {i.resolvedAt && <p className="mt-2 text-xs">Cierre: {incidentDate(i.resolvedAt)} · {i.closureBusinessDays} días hábiles</p>}</td>
        </tr>)}</tbody>
      </table>
    </div>
  </>;
}
