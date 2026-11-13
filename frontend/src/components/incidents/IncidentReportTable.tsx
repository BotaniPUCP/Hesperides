'use client';

import Link from 'next/link';
import type { Incident } from '@shared/types';
import { StatusBadge } from '@/components/ui';
import { incidentDate } from '@/lib/incidentNavigation';

export function IncidentReportTable({ incidents, href }: { incidents: Incident[]; href: (path: string) => string }) {
  return <>
    <ul className="divide-y divide-neutral-100 md:hidden">{incidents.map(i => <li key={i.id}>
      <Link href={href(`/incidencias/${i.id}`)} className="block space-y-2 px-5 py-4 hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-brand-600">
        <div className="flex items-center justify-between gap-3"><span className="text-[11px] font-semibold text-brand-800">{i.officialCode ?? `Reporte #${i.id}`}</span><StatusBadge code={i.status.code} label={i.status.label}/></div>
        <p className="line-clamp-2 text-xs font-medium">{i.description}</p>
        <p className="truncate text-[10px] text-neutral-600">{i.matrix.zone?.label ?? i.locationReference ?? 'Ubicación no indicada'} · {incidentDate(i.createdAt)}</p>
      </Link>
    </li>)}</ul>
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full table-fixed text-left text-xs"><caption className="sr-only">Resumen de reportes de incidencias</caption>
        <thead className="bg-neutral-50 text-[10px] uppercase tracking-wide text-neutral-600"><tr>
          <th className="w-[36%] px-5 py-3 font-medium">Reporte</th><th className="w-[24%] px-5 py-3 font-medium">Ubicación</th>
          <th className="w-[22%] px-5 py-3 font-medium">Responsable</th><th className="w-[18%] px-5 py-3 font-medium">Estado</th>
        </tr></thead>
        <tbody className="divide-y divide-neutral-100">{incidents.map(i => <tr key={i.id} className="hover:bg-neutral-50">
          <td className="px-5 py-3 align-middle"><Link href={href(`/incidencias/${i.id}`)} className="block min-w-0 hover:underline">
            <span className="text-[10px] font-semibold text-brand-800">{i.officialCode ?? `Reporte #${i.id}`}</span><span className="mt-1 block truncate font-medium text-neutral-800" title={i.description}>{i.description}</span>
          </Link></td>
          <td className="px-5 py-3 align-middle"><span className="line-clamp-2 text-neutral-600">{i.matrix.zone?.label ?? i.locationReference ?? 'Sin identificar'}</span><span className="mt-1 block text-[10px] text-neutral-600">{i.matrix.zone?.sectorLabel}</span></td>
          <td className="px-5 py-3 align-middle"><span className="block truncate text-neutral-600">{i.matrix.responsible?.fullName ?? 'Por asignar'}</span><span className="mt-1 block truncate text-[10px] text-neutral-600">{i.team?.name}</span></td>
          <td className="px-5 py-3 align-middle"><StatusBadge code={i.status.code} label={i.status.label}/></td>
        </tr>)}</tbody>
      </table>
    </div>
  </>;
}
