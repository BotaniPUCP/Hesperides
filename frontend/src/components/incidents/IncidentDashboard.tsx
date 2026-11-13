'use client';

import { useState, type ReactNode } from 'react';
import type { IncidentDistribution, IncidentMatrixSummary } from '@shared/types';
import { Button, Card } from '@/components/ui';
import { incidentsApi } from '@/lib/incidents-api';
import { mensajeDeApiError } from '@/lib/api-errors';
import { IncidentPanel } from './IncidentPresentation';

function Distribution({ title, rows }: { title: string; rows: IncidentDistribution[] }) {
  const max=Math.max(1,...rows.map(r => r.count));
  return <IncidentPanel title={title} aside={<span className="text-[10px] text-neutral-600">{rows.reduce((sum, row) => sum + row.count, 0)} reportes</span>}><div className="px-5 py-6">{rows.length ? <ul className="space-y-5 text-xs">{rows.slice(0,8).map((row) =>
    <li key={row.label} className="space-y-2"><div className="flex items-start justify-between gap-3"><span className="min-w-0 break-words text-neutral-600">{row.label}</span>
      <span className="font-semibold tabular-nums">{row.count}</span></div>
      <meter min={0} max={max} value={row.count} aria-label={`${title}: ${row.label}`} className="sr-only">{row.count}</meter>
      <svg aria-hidden="true" viewBox="0 0 100 8" preserveAspectRatio="none" className="h-2 w-full overflow-hidden rounded-sm"><rect width="100" height="8" rx="2" className="fill-neutral-100" /><rect width={row.count/max*100} height="8" rx="2" className={row.label === 'Alta' ? 'fill-urgency-high-fg/70' : row.label === 'Media' ? 'fill-warning-600/60' : row.label === 'Sin evaluar' ? 'fill-neutral-400' : 'fill-brand-700/65'} /></svg>
    </li>)}</ul> : <p className="text-xs text-neutral-700">Sin datos.</p>}</div></IncidentPanel>;
}

function ReportProgress({ rows }: { rows: IncidentDistribution[] }) {
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  const colors = ['text-warning-600/70', 'text-info-600/70', 'text-brand-700/75', 'text-neutral-500', 'text-status-in-review-fg', 'text-brand-400', 'text-action-danger', 'text-neutral-700'];
  return <IncidentPanel title="Avance de los reportes" aside={<span className="text-[10px] text-neutral-600">{total} reportes</span>}>
    {!total ? <p className="p-5 text-xs text-neutral-700">Sin datos.</p> : <div className="flex items-center gap-6 px-5 py-6">
      <div className="relative h-32 w-32 shrink-0">
        <svg viewBox="0 0 120 120" className="h-32 w-32 -rotate-90" role="img" aria-label={rows.map(row => `${row.label}: ${row.count}`).join(', ')}>
          <circle cx="60" cy="60" r="48" fill="none" stroke="currentColor" strokeWidth="12" className="text-neutral-100" />
          {rows.map((row, index) => {
            const length = row.count / total * 100;
            const start = rows.slice(0, index).reduce((sum, previous) => sum + previous.count, 0) / total * 100;
            return <circle key={row.label} cx="60" cy="60" r="48" fill="none" stroke="currentColor" strokeWidth="12" pathLength="100"
              strokeDasharray={`${Math.max(0,length - 1)} ${100 - Math.max(0,length - 1)}`} strokeDashoffset={-start} className={colors[index % colors.length]} />;
          })}
        </svg>
        <div className="absolute inset-0 grid place-content-center text-center"><strong className="text-[28px] font-semibold leading-tight tabular-nums">{total}</strong><span className="mt-1 text-[9px] uppercase text-neutral-600">reportes</span></div>
      </div>
      <ul className="min-w-0 flex-1 space-y-3">{rows.map((row, index) => <li key={row.label} className="flex items-center gap-2 text-[11px] text-neutral-600">
        <span aria-hidden="true" className={colors[index % colors.length]}>●</span><span className="min-w-0 flex-1 break-words">{row.label}</span><strong className="tabular-nums">{row.count}</strong>
      </li>)}</ul>
    </div>}
  </IncidentPanel>;
}

export function IncidentExportButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return <div className="space-y-2">
    <Button size="lg" variant="ghost" loading={busy} onClick={async () => {
      setBusy(true); setError('');
      try {
        const file = await incidentsApi.export();
        const url = URL.createObjectURL(new Blob([file.content], { type: file.contentType }));
        const link = document.createElement('a');
        link.href = url; link.download = file.filename; document.body.appendChild(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 0);
      } catch (ex) { setError(mensajeDeApiError(ex)); }
      finally { setBusy(false); }
    }}>Exportar matriz OSG</Button>
    <span className="sr-only">CSV de registros aprobados: 23 columnas, independiente de los filtros.</span>
    {error && <p role="alert" className="text-sm text-action-danger">{error}</p>}
  </div>;
}

export function IncidentDashboard({ matrix, progress, children }: { matrix: IncidentMatrixSummary; progress?: IncidentDistribution[]; children?: ReactNode }) {
  return <div className="space-y-3">
    <div className="grid gap-5 sm:grid-cols-2">
      <ReportProgress rows={progress ?? matrix.states} />
      <Distribution title="Severidad de los reportes" rows={matrix.severities} />
    </div>
    <details className="border-t border-neutral-200 pt-3">
      <summary className="min-h-12 cursor-pointer py-3 text-sm font-semibold text-brand-800">Más análisis: servicios, causas y responsables</summary>
      <div className="space-y-5 pt-3">
      {children}
    <div className="grid gap-3 sm:grid-cols-2">
      <Card><p className="text-sm text-neutral-700">Acciones requeridas pendientes</p><p className="mt-2 text-3xl font-semibold">{matrix.pendingActions}</p></Card>
      <Card><p className="text-sm text-neutral-700">Promedio de cierre · días hábiles inclusivos</p>
        <p className="mt-2 text-3xl font-semibold">{matrix.averageClosureBusinessDays === null ? '—' : matrix.averageClosureBusinessDays.toLocaleString('es-PE', { maximumFractionDigits: 1 })}</p>
        <p className="text-xs text-neutral-700">Solo casos cerrados ({matrix.closedWithDuration}). No es un indicador de SLA.</p></Card>
    </div>
    <p className="text-sm text-neutral-700">Distribuciones de todos los reportes recibidos, incluidos los pendientes de registro. Un caso puede tener varios impactos. Urgencia, sector y carga por responsable incluyen solo casos activos; se muestran hasta ocho grupos por gráfico.</p>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Distribution title="Por impacto" rows={matrix.impacts} />
      <Distribution title="Por servicio" rows={matrix.services} />
      <Distribution title="Carga por responsable" rows={matrix.responsiblePeople} />
      <Distribution title="Activas por urgencia" rows={matrix.urgencies} />
      <Distribution title="Por causa raíz catalogada" rows={matrix.rootCauses} />
      <Distribution title="Empresa de atención" rows={matrix.companies} />
      <Distribution title="Activas por sector" rows={matrix.sectors} />
      <Distribution title="Secciones con más reportes" rows={matrix.locations} />
      <Distribution title="Por tipo de evento" rows={matrix.events} />
      <Distribution title="Por canal de ingreso" rows={matrix.channels} />
    </div>
      </div>
    </details>
  </div>;
}
